import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle user denial or error
  if (error) {
    return NextResponse.redirect(
      new URL("/settings/studio?google_error=" + error, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings/studio?google_error=no_code", request.url)
    );
  }

  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  // Redirect URI must match exactly what was sent in the auth request
  const REDIRECT_URI =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/auth/google/callback";

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Chưa cấu hình GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET" },
      { status: 500 }
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("Google Token Error:", tokens);
      return NextResponse.redirect(
        new URL("/settings/studio?google_error=" + tokens.error, request.url)
      );
    }

    // Save tokens to Database (studio_info table)
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get the first studio_info record
    const { data: studioInfo } = await supabase
      .from("studio_info")
      .select("id, google_calendar_auth")
      .maybeSingle();

    const newAuthData = {
      ...((studioInfo?.google_calendar_auth as Record<string, unknown>) || {}),
      ...tokens,
      updated_at: new Date().toISOString(),
    };

    if (studioInfo) {
      const { error: updateError } = await supabase
        .from("studio_info")
        .update({ google_calendar_auth: newAuthData })
        .eq("id", studioInfo.id);

      if (updateError) throw updateError;
    } else {
      // Create a default record if none exists (fallback)
      const { error: insertError } = await supabase.from("studio_info").insert([
        {
          name: "Mood Studio",
          google_calendar_auth: newAuthData,
        },
      ]);

      if (insertError) throw insertError;
    }

    revalidatePath("/settings");
    revalidatePath("/settings/studio");
    return NextResponse.redirect(
      new URL("/settings/studio?google_connected=success", request.url)
    );
  } catch (err) {
    console.error("Callback Error:", err);
    return NextResponse.redirect(
      new URL("/settings/studio?google_error=internal_error", request.url)
    );
  }
}
