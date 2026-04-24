"use server";

import { createClient } from "@/lib/supabase/server";
import { getRequestBaseUrl } from "@/lib/auth-recovery";
import {
  forgotPasswordRequestSchema,
  normalizeAuthIdentifier,
} from "@/lib/validations/auth.schema";

type PasswordRecoveryResult =
  | {
      success: true;
      data: {
        normalizedIdentifier: string;
        message: string;
      };
    }
  | { success: false; error: string };

export async function requestPasswordReset(
  formData: FormData,
): Promise<PasswordRecoveryResult> {
  const parsed = forgotPasswordRequestSchema.safeParse({
    identifier: formData.get("identifier"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.flatten().fieldErrors.identifier?.[0] ??
        "Tên đăng nhập hoặc email không hợp lệ",
    };
  }

  const normalizedIdentifier = normalizeAuthIdentifier(parsed.data.identifier);
  const supabase = await createClient();
  const baseUrl = await getRequestBaseUrl();
  const redirectTo = new URL("/reset-password", baseUrl);
  redirectTo.searchParams.set("flow", "recovery");

  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizedIdentifier,
    {
      redirectTo: redirectTo.toString(),
    },
  );

  if (error) {
    console.error("[requestPasswordReset] Failed to send recovery email", error);
    return {
      success: false,
      error:
        "Không thể gửi email đặt lại mật khẩu lúc này. Vui lòng thử lại sau.",
    };
  }

  return {
    success: true,
    data: {
      normalizedIdentifier,
      message:
        "Nếu tài khoản tồn tại, hệ thống đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.",
    },
  };
}
