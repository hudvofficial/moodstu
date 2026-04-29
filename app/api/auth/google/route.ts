import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireSettingsAdminAccess } from "@/lib/auth_utils";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const GOOGLE_OAUTH_STATE_COOKIE = "mood_google_oauth_state";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/auth/google/callback";
  const appBaseUrl = new URL(redirectUri).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appBaseUrl));
  }

  try {
    const adminClient = await createAdminClient();
    await requireSettingsAdminAccess(adminClient, user.id);
  } catch {
    return NextResponse.redirect(
      new URL("/settings?google_error=forbidden", appBaseUrl),
    );
  }

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "Chua cau hinh Google Client ID. Vui long them GOOGLE_CLIENT_ID vao .env",
      },
      { status: 500 },
    );
  }

  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
