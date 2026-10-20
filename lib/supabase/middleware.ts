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
import { decideAuthRedirect, isRetryableAuthError, LAST_PATH_COOKIE } from "@/lib/navigation/auth-redirect";

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
    // DEV-only E2E helper — allows Playwright tests to mint a session
    // via /api/e2e/login without first authenticating through /login.
    // Production builds get a 404 from the route itself (see route.ts).
    "/api/e2e/",
  ];
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isLoginRoute = pathname === "/login";

  if (isPublicRoute && !isLoginRoute) {
    return supabaseResponse;
  }

  let isAuthenticated = false;
  let claims: Record<string, unknown> | null = null;

  const readClaims = async (): Promise<{ claims: Record<string, unknown> | null; error: unknown }> => {
    try {
      const { data, error } = await supabase.auth.getClaims();
      return { claims: !error && data?.claims?.sub ? data.claims : null, error };
    } catch (error) {
      return { claims: null, error };
    }
  };

  const claimsStartedAt = performance.now();
  try {
    let result = await readClaims();
    // ADR-021: refresh lỗi thoáng qua (mạng di động, app vừa thức dậy) không được coi là "chưa đăng nhập" ngay.
    // Gọi lại ngay, không chờ — vẫn trong khoảng cho phép dùng lại refresh token nếu lần đầu đã tới Supabase.
    if (!result.claims && isRetryableAuthError(result.error)) {
      result = await readClaims();
    }
    claims = result.claims;
    isAuthenticated = !!claims;
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
    
    // Remake response to include newly set headers in downstream requests.
    // Phải mang theo cookie phiên vừa refresh (setAll ở trên ghi vào response cũ): tạo response mới mà bỏ cookie
    // thì trình duyệt giữ refresh token đã bị xoay vòng → lần refresh sau "Already Used" → bị đăng xuất/đá về /login
    // (cảnh báo chính thức của @supabase/ssr). Request đi xuống cũng phải mang cookie mới, không phải bản chụp lúc đầu.
    const refreshedCookies = supabaseResponse.cookies.getAll();
    if (refreshedCookies.length > 0) {
      requestHeaders.set("cookie", request.cookies.toString());
    }
    supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
    refreshedCookies.forEach((cookie) => supabaseResponse.cookies.set(cookie));
  }

  const redirectWithCookies = (target: string) => {
    const url = request.nextUrl.clone();
    const parsedTarget = new URL(target, url.origin);
    url.pathname = parsedTarget.pathname;
    url.search = parsedTarget.search;

    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });

    return noStore(response);
  };

  // ADR-021: đi qua /login thì quay về đúng trang đang mở (next / trang cuối khi mở lại app), không cứng /dashboard.
  const redirectTarget = decideAuthRedirect({
    isAuthenticated,
    isPublicRoute,
    isLoginRoute,
    method: request.method,
    pathname,
    search: request.nextUrl.search,
    nextParam: request.nextUrl.searchParams.get("next"),
    sourceParam: request.nextUrl.searchParams.get("source"),
    lastPathCookie: request.cookies.get(LAST_PATH_COOKIE)?.value ?? null,
    appOrigin: request.nextUrl.origin,
  });
  if (redirectTarget) {
    return redirectWithCookies(redirectTarget);
  }

  return noStore(supabaseResponse);
}
