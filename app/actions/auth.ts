"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// ═══════════════════════════════════════════
// Auth Server Actions — Copy from V1 (proven)
// Rate limiting + Remember Me + Employee cache
// ═══════════════════════════════════════════

type LoginResult = { success: true } | { error: string };



/** Sanitize auth errors — user-friendly messages */
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

export async function login(formData: FormData): Promise<LoginResult> {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Vui lòng nhập email và mật khẩu" };
  }

  const supabase = await createClient();

  // 2. Smart Username Logic: Append @moodwedding.com if no @ is present
  const finalEmail = email.includes("@") ? email : `${email}@moodwedding.com`;

  // 3. Rate Limiting Check (Database-backed)
  const { data: attempt } = await supabase
    .from("login_attempts")
    .select("*")
    .eq("email", finalEmail)
    .single();

  const MAX_ATTEMPTS = 5;

  if (attempt && attempt.locked_until) {
    const lockedUntil = new Date(attempt.locked_until);
    if (lockedUntil > new Date()) {
      const remainSec = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      return { error: `Bạn đã thử quá nhiều lần. Vui lòng đợi ${remainSec} giây` };
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ 
    email: finalEmail, 
    password 
  });

  if (error) {
    // 📝 Record failed attempt in DB
    if (attempt) {
      const newCount = attempt.attempt_count + 1;
      const isLocking = newCount >= MAX_ATTEMPTS;
      
      await supabase
        .from("login_attempts")
        .update({
          attempt_count: isLocking ? 0 : newCount,
          last_attempt: new Date().toISOString(),
          locked_until: isLocking ? new Date(Date.now() + 60000).toISOString() : null
        })
        .eq("email", finalEmail);
    } else {
      await supabase
        .from("login_attempts")
        .insert({ email: finalEmail, attempt_count: 1 });
    }
    
    return { error: sanitizeAuthError(error.message) };
  }

  // ✅ Success → Clear attempts
  await supabase.from("login_attempts").delete().eq("email", finalEmail);

  // 🔒 Remember Me cookie pattern (from V1)
  const rememberMe = formData.get("rememberMe") === "on";
  const cookieStore = await cookies();

  if (rememberMe) {
    cookieStore.set("session_type", "persistent", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  } else {
    cookieStore.set("session_type", "temporary", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

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
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
