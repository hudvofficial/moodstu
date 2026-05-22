"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizeAuthIdentifier } from "@/lib/validations/auth.schema";

type LoginResult = { success: true } | { error: string };

type LoginAttempt = {
  attempt_count: number | null;
  locked_until: string | null;
};

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 60;
const ATTEMPT_HINT_COOKIE = "login_attempt_hint";
const ATTEMPT_HINT_MAX_AGE = 10 * 60;
const DEFAULT_LOGIN_PROFILE_SLOW_MS = 700;

function getLoginProfileSlowMs() {
  const configured = Number(process.env.AUTH_LOGIN_PROFILE_SLOW_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_LOGIN_PROFILE_SLOW_MS;
}

function shouldLogLoginTiming(totalMs: number) {
  if (process.env.AUTH_LOGIN_PROFILE === "1") return true;
  if (process.env.AUTH_LOGIN_PROFILE === "0") return false;
  return totalMs >= getLoginProfileSlowMs();
}

function createLoginTiming() {
  const startedAt = performance.now();
  let stepStartedAt = startedAt;
  const steps: string[] = [];

  return {
    mark(label: string) {
      const now = performance.now();
      steps.push(`${label}=${Math.round(now - stepStartedAt)}ms`);
      stepStartedAt = now;
    },
    done(outcome: string) {
      const totalMs = Math.round(performance.now() - startedAt);
      if (shouldLogLoginTiming(totalMs)) {
        console.warn(
          `[auth-login-profile] outcome=${outcome} total=${totalMs}ms ${steps.join(" ")}`,
        );
      }
    },
  };
}

function sanitizeAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng";
  }
  if (message.includes("Email not confirmed")) {
    return "Email chưa được xác nhận";
  }
  if (message.includes("Too many requests")) {
    return "Thử quá nhiều lần. Vui lòng đợi";
  }
  return "Đã xảy ra lỗi. Vui lòng thử lại";
}

function getLockError(attempt: LoginAttempt | null) {
  if (!attempt?.locked_until) return null;

  const lockedUntil = new Date(attempt.locked_until);
  if (lockedUntil <= new Date()) return null;

  const remainSec = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
  return `Bạn đã thử quá nhiều lần. Vui lòng đợi ${remainSec} giây`;
}

function setAttemptHintCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(ATTEMPT_HINT_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/login",
    maxAge: ATTEMPT_HINT_MAX_AGE,
  });
}

function clearAttemptHintCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(ATTEMPT_HINT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/login",
    maxAge: 0,
  });
}

async function loadLoginAttempt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
) {
  const { data } = await supabase
    .from("login_attempts")
    .select("attempt_count, locked_until")
    .eq("email", email)
    .maybeSingle();

  return (data as LoginAttempt | null) ?? null;
}

export async function login(formData: FormData): Promise<LoginResult> {
  const timing = createLoginTiming();
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    timing.done("invalid-form");
    return { error: "Vui lòng nhập email và mật khẩu" };
  }

  const cookieStore = await cookies();
  const supabase = await createClient();
  const finalEmail = normalizeAuthIdentifier(email);
  timing.mark("bootstrap");

  let attempt: LoginAttempt | null = null;
  const shouldPrecheckRateLimit =
    cookieStore.get(ATTEMPT_HINT_COOKIE)?.value === "1";

  if (shouldPrecheckRateLimit) {
    attempt = await loadLoginAttempt(supabase, finalEmail);
    timing.mark("rate-limit-precheck");

    const lockError = getLockError(attempt);
    if (lockError) {
      timing.done("rate-limited");
      return { error: lockError };
    }
  } else {
    timing.mark("rate-limit-skip");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: finalEmail,
    password,
  });
  timing.mark("supabase-auth");

  if (error) {
    if (!attempt) {
      attempt = await loadLoginAttempt(supabase, finalEmail);
      timing.mark("rate-limit-load");
    }

    const lockError = getLockError(attempt);
    if (lockError) {
      setAttemptHintCookie(cookieStore);
      timing.done("rate-limited-after-auth");
      return { error: lockError };
    }

    if (attempt) {
      const newCount = (attempt.attempt_count || 0) + 1;
      const isLocking = newCount >= MAX_ATTEMPTS;

      await supabase
        .from("login_attempts")
        .update({
          attempt_count: isLocking ? 0 : newCount,
          last_attempt: new Date().toISOString(),
          locked_until: isLocking
            ? new Date(Date.now() + LOCK_SECONDS * 1000).toISOString()
            : null,
        })
        .eq("email", finalEmail);
    } else {
      await supabase
        .from("login_attempts")
        .insert({ email: finalEmail, attempt_count: 1 });
    }

    setAttemptHintCookie(cookieStore);
    timing.mark("record-failure");
    timing.done("auth-error");
    return { error: sanitizeAuthError(error.message) };
  }

  if (attempt) {
    await supabase.from("login_attempts").delete().eq("email", finalEmail);
    timing.mark("clear-attempts");
  } else {
    timing.mark("clear-attempts-skip");
  }

  clearAttemptHintCookie(cookieStore);

  const rememberMe = formData.get("rememberMe") === "on";
  if (rememberMe) {
    cookieStore.set("session_type", "persistent", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  } else {
    cookieStore.set("session_type", "temporary", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  timing.mark("cookies");
  timing.done("success");
  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete("session_type");

  redirect("/login");
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: sanitizeAuthError(error.message) };
  }

  if (data.url) {
    redirect(data.url);
  }
}
