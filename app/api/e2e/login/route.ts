import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * DEV-ONLY helper for E2E visual-regression tests.
 *
 *   GET  /api/e2e/login?email=...&password=...&next=/path
 *   POST /api/e2e/login  { email, password, next? }
 *
 *   → exchanges password for session via Supabase Auth,
 *     writes the SSR cookie on the redirect response, then 303s to `next`.
 *
 * Important: in Next.js 15 route handlers, `cookies().set()` from
 * `next/headers` does NOT auto-attach to the outgoing response. We must
 * set every cookie on the NextResponse object directly so the browser
 * persists them before following the redirect.
 *
 * Returns 404 in production to avoid leaking auth surface.
 */
async function handle(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let email = "";
  let password = "";
  let next = "/dashboard";

  if (request.method === "GET") {
    const url = new URL(request.url);
    email = url.searchParams.get("email") ?? "";
    password = url.searchParams.get("password") ?? "";
    const nextParam = url.searchParams.get("next");
    if (nextParam) next = nextParam;
  } else {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
        next?: string;
      };
      email = body.email ?? "";
      password = body.password ?? "";
      if (body.next) next = body.next;
    } else {
      const form = await request.formData();
      email = (form.get("email") as string) ?? "";
      password = (form.get("password") as string) ?? "";
      const nextForm = form.get("next");
      if (typeof nextForm === "string" && nextForm) next = nextForm;
    }
  }

  if (!email || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  // Use the inbound Host header so the redirect points at the same origin
  // the browser will use next. (new URL(request.url).origin can come back
  // as `localhost` on some dev-server dual-stack bind configs even when
  // the browser hit us via `127.0.0.1` — cookies would then be set for
  // the wrong host and the next navigation would bounce to /login.)
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  const redirectUrl = new URL(`${protocol}://${host}${next}`);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  // Build a Supabase client that writes session cookies directly onto our
  // `response` object — that's the only way they survive the redirect.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [] as { name: string; value: string }[];
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return NextResponse.json(
      { error: error.message ?? "signin_failed" },
      { status: 401 },
    );
  }

  // Mirror the /auth/callback behaviour so subsequent renders see a
  // persistent session cookie.
  response.cookies.set("session_type", "persistent", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}

export const GET = handle;
export const POST = handle;
