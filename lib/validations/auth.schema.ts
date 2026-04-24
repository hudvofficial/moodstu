import { z } from "zod";

export const INTERNAL_AUTH_EMAIL_DOMAIN = "moodwedding.com";

const emailAddressSchema = z.string().email("Email không hợp lệ");

export function normalizeAuthIdentifier(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value) return "";
  return value.includes("@")
    ? value
    : `${value}@${INTERNAL_AUTH_EMAIL_DOMAIN}`;
}

export const forgotPasswordRequestSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên đăng nhập hoặc email")
      .max(320, "Tên đăng nhập hoặc email quá dài"),
  })
  .refine(
    (data) =>
      emailAddressSchema.safeParse(
        normalizeAuthIdentifier(data.identifier),
      ).success,
    {
      path: ["identifier"],
      message: "Tên đăng nhập hoặc email không hợp lệ",
    },
  );

export const passwordPolicySchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .max(72, "Mật khẩu tối đa 72 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái")
  .regex(/\d/, "Mật khẩu phải chứa ít nhất 1 chữ số");

export const resetPasswordSchema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z
      .string()
      .min(1, "Vui lòng nhập lại mật khẩu mới"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

export type ForgotPasswordRequestInput = z.infer<
  typeof forgotPasswordRequestSchema
>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
