import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth-recovery";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");
  const defaultNext =
    otpType === "recovery" ? "/reset-password?flow=recovery" : "/";
  const next = sanitizeNextPath(
    requestUrl.searchParams.get("next"),
    defaultNext,
  );

  const errorRedirect = new URL(
    otpType === "recovery" ? "/reset-password" : "/login",
    requestUrl.origin,
  );

  if (otpType === "recovery") {
    errorRedirect.searchParams.set("flow", "recovery");
  }
  errorRedirect.searchParams.set("error", "invalid_or_expired_link");

  if (!tokenHash || !otpType) {
    return NextResponse.redirect(errorRedirect);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: otpType as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("[auth/confirm] Failed to verify OTP", error);
    return NextResponse.redirect(errorRedirect);
  }

  const successRedirect = new URL(next, requestUrl.origin);
  if (otpType === "recovery") {
    successRedirect.searchParams.set("flow", "recovery");
  }

  return NextResponse.redirect(successRedirect);
}
