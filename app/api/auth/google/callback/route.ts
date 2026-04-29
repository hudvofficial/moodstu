import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireSettingsAdminAccess } from "@/lib/auth_utils";
import {
  encryptGoogleCalendarAuth,
  decryptGoogleCalendarAuth,
  redactGoogleCalendarAuth,
  safeCompareSecret,
} from "@/lib/settings-secrets";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const GOOGLE_OAUTH_STATE_COOKIE = "mood_google_oauth_state";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const runtime = "nodejs";

function redirectTo(path: string, request: Request) {
  return NextResponse.redirect(new URL(path, request.url));
}

async function clearStateCookie() {
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 0,
  });
}

async function validateState(requestState: string | null) {
  const cookieStore = await cookies();
  const storedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value || "";
  if (!requestState || !storedState) return false;
  return safeCompareSecret(requestState, storedState);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  try {
    const isValidState = await validateState(state);
    await clearStateCookie();

    if (!isValidState) {
      return redirectTo("/settings/studio?google_error=invalid_state", request);
    }

    if (error) {
      return redirectTo(`/settings/studio?google_error=${encodeURIComponent(error)}`, request);
    }

    if (!code) {
      return redirectTo("/settings/studio?google_error=no_code", request);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/api/auth/google/callback";

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Chua cau hinh GOOGLE_CLIENT_ID hoac GOOGLE_CLIENT_SECRET" },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return redirectTo("/login", request);
    }

    const adminClient = await createAdminClient();
    await requireSettingsAdminAccess(adminClient, user.id);

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenResponse.json()) as Record<string, unknown>;

    if (!tokenResponse.ok || tokens.error) {
      const tokenError =
        typeof tokens.error === "string" ? tokens.error : "token_error";
      console.error("Google Token Error:", tokens);
      return redirectTo(
        `/settings/studio?google_error=${encodeURIComponent(tokenError)}`,
        request,
      );
    }

    const { data: studioInfo, error: studioError } = await adminClient
      .from("studio_info")
      .select("id, google_calendar_auth")
      .limit(1)
      .maybeSingle();

    if (studioError) throw studioError;

    const existingAuth = decryptGoogleCalendarAuth(studioInfo?.google_calendar_auth);
    const mergedAuth = {
      ...(existingAuth || {}),
      ...tokens,
      refresh_token:
        typeof tokens.refresh_token === "string"
          ? tokens.refresh_token
          : existingAuth?.refresh_token,
      updated_at: new Date().toISOString(),
    };
    const encryptedAuth = encryptGoogleCalendarAuth(mergedAuth);

    if (studioInfo) {
      const { error: updateError } = await adminClient
        .from("studio_info")
        .update({ google_calendar_auth: encryptedAuth })
        .eq("id", studioInfo.id);

      if (updateError) throw updateError;

      await writeAuditLog({
        action: "UPDATE",
        tableName: "studio_info",
        recordId: studioInfo.id,
        description: "Ket noi Google Calendar",
        oldData: {
          google_calendar_auth: redactGoogleCalendarAuth(
            studioInfo.google_calendar_auth,
          ),
        },
        newData: { google_calendar_auth: redactGoogleCalendarAuth(encryptedAuth) },
        source: "server_action",
      });
    } else {
      const { data: created, error: insertError } = await adminClient
        .from("studio_info")
        .insert([{ name: "Mood Studio", google_calendar_auth: encryptedAuth }])
        .select("id")
        .single();

      if (insertError) throw insertError;

      await writeAuditLog({
        action: "CREATE",
        tableName: "studio_info",
        recordId: created.id,
        description: "Ket noi Google Calendar",
        newData: { google_calendar_auth: redactGoogleCalendarAuth(encryptedAuth) },
        source: "server_action",
      });
    }

    revalidatePath("/settings");
    revalidatePath("/settings/studio");
    revalidateTag("studio-info", { expire: 0 });

    return redirectTo("/settings/studio?google_connected=success", request);
  } catch (err) {
    await clearStateCookie();
    console.error("Callback Error:", err);
    return redirectTo("/settings/studio?google_error=internal_error", request);
  }
}
