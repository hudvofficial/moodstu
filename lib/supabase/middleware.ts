// ═══════════════════════════════════════════
// Supabase Middleware Client
// Used in Next.js middleware for route protection
// IMPORTANT: getSession() NOT getUser() — per lessons.md
// ═══════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ⚡ getSession() — NOT getUser()! (200-400ms savings per lessons.md #10)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Public routes — no auth needed
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
  const isPublicRoute = publicRoutes.some((r) =>
    request.nextUrl.pathname.startsWith(r)
  );

  if (!session && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already logged in → redirect away from login
  if (session && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
