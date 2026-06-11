import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  clearAuthProxyHeaders,
  AUTH_PROXY_SOURCE_HEADER,
  AUTH_PROXY_SUB_HEADER,
  AUTH_PROXY_EMAIL_HEADER,
  AUTH_PROXY_ROLE_HEADER,
  AUTH_PROXY_FULL_NAME_HEADER,
} from "@/lib/auth-proxy-headers";

const DEFAULT_AUTH_SHELL_PROFILE_SLOW_MS = 700;

function getAuthShellProfileSlowMs() {
  const configured = Number(process.env.AUTH_CONTEXT_PROFILE_SLOW_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_AUTH_SHELL_PROFILE_SLOW_MS;
}

function shouldLogAuthShellTiming(durationMs: number) {
  if (process.env.AUTH_CONTEXT_PROFILE === "1") return true;
  if (process.env.AUTH_CONTEXT_PROFILE === "0") return false;
  if (process.env.AUTH_LOGIN_PROFILE === "1") return true;
  return durationMs >= getAuthShellProfileSlowMs();
}

function logAuthShellTiming(label: string, durationMs: number, detail?: string) {
  if (!shouldLogAuthShellTiming(durationMs)) return;
  console.warn(
    `[auth-shell-profile] ${label}=${durationMs}ms${detail ? ` ${detail}` : ""}`,
  );
}

function noStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  clearAuthProxyHeaders(requestHeaders);

  const nextResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  let supabaseResponse = nextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const publicRoutes = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/account-disabled",
    "/auth",
    "/offline",
    "/api/auth",
    "/api/drive-download",
    "/api/og",
    "/api/gallery-download",
    "/api/gallery-download-batch",
    "/gallery",
    "/manifest.json",
    "/sw.js",
    "/push-sw.js",
    "/workbox-",
    "/fallback-",
    "/swe-worker-",
    "/favicon.ico",
    "/icon.png",
    "/apple-icon.png",
    "/icons/",
  ];
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isLoginRoute = pathname === "/login";

  if (isPublicRoute && !isLoginRoute) {
    return supabaseResponse;
  }

  let isAuthenticated = false;
  let claims: Record<string, unknown> | null = null;

  const claimsStartedAt = performance.now();
  try {
    const { data, error } = await supabase.auth.getClaims();
    claims = !error && data?.claims?.sub ? data.claims : null;
    isAuthenticated = !!claims;
  } catch {
    isAuthenticated = false;
    claims = null;
  } finally {
    logAuthShellTiming(
      "middleware.claims",
      Math.round(performance.now() - claimsStartedAt),
      isAuthenticated ? "authenticated=true" : "authenticated=false",
    );
  }

  if (claims) {
    requestHeaders.set(AUTH_PROXY_SOURCE_HEADER, "middleware");
    requestHeaders.set(AUTH_PROXY_SUB_HEADER, String(claims.sub));

    if (typeof claims.email === "string") {
      requestHeaders.set(AUTH_PROXY_EMAIL_HEADER, claims.email);
    }

    const appMetadata = claims.app_metadata && typeof claims.app_metadata === "object"
      ? (claims.app_metadata as Record<string, unknown>)
      : {};
    const userMetadata = claims.user_metadata && typeof claims.user_metadata === "object"
      ? (claims.user_metadata as Record<string, unknown>)
      : {};

    const role = typeof appMetadata.role === "string"
      ? appMetadata.role
      : typeof userMetadata.role === "string"
        ? userMetadata.role
        : null;
    const fullName = typeof userMetadata.full_name === "string" ? userMetadata.full_name : null;

    if (role) requestHeaders.set(AUTH_PROXY_ROLE_HEADER, role);
    if (fullName) requestHeaders.set(AUTH_PROXY_FULL_NAME_HEADER, fullName);
    
    // Remake response to include newly set headers in downstream requests
    supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  }

  const redirectWithCookies = (targetPathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = targetPathname;
    url.search = "";

    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });

    return noStore(response);
  };

  if (!isAuthenticated && !isPublicRoute) {
    return redirectWithCookies("/login");
  }

  if (isAuthenticated && isLoginRoute) {
    return redirectWithCookies("/dashboard");
  }

  return noStore(supabaseResponse);
}
