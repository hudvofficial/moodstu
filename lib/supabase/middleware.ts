import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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
    "/auth",
    "/offline",
    "/api/auth",
    "/gallery",
    "/manifest.json",
    "/sw.js",
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

  try {
    const { data, error } = await supabase.auth.getClaims();
    isAuthenticated = !error && !!data?.claims?.sub;
  } catch {
    isAuthenticated = false;
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
