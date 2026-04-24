"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import AuthShell from "@/components/auth/auth-shell";
import { requestPasswordReset } from "@/app/actions/password-recovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordRequestSchema,
  normalizeAuthIdentifier,
} from "@/lib/validations/auth.schema";

const RESEND_COOLDOWN_SECONDS = 30;

export default function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submitResetRequest = async (rawIdentifier: string) => {
    const parsed = forgotPasswordRequestSchema.safeParse({
      identifier: rawIdentifier,
    });

    if (!parsed.success) {
      setError(
        parsed.error.flatten().fieldErrors.identifier?.[0] ??
          "Tên đăng nhập hoặc email không hợp lệ",
      );
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    const formData = new FormData();
    formData.set("identifier", rawIdentifier);

    const result = await requestPasswordReset(formData);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    setSentTo(result.data.normalizedIdentifier);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    toast.success(result.data.message);
  };

  const handleSubmit = async (formData: FormData) => {
    const rawIdentifier = String(formData.get("identifier") ?? "");
    await submitResetRequest(rawIdentifier);
  };

  if (sentTo) {
    return (
      <AuthShell
        title="Kiểm tra hộp thư"
        subtitle="Liên kết đặt lại mật khẩu đã được gửi nếu tài khoản tồn tại."
        backHref="/login"
        backLabel="Quay lại đăng nhập"
      >
        <div className="space-y-6">
          <div className="rounded-3xl bg-bg-base p-6 shadow-xs text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <p className="text-body-sm text-text-secondary">
                Nếu tài khoản tồn tại, hệ thống đã gửi email khôi phục đến:
              </p>
              <p className="text-body font-semibold text-text-primary break-all">
                {sentTo}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-bg-base p-5 shadow-xs space-y-2">
            <p className="label-base">Lưu ý</p>
            <p className="text-sm text-text-secondary">
              Email có thể đến chậm 1-2 phút. Hãy kiểm tra cả mục Spam/Junk nếu
              bạn chưa thấy thư.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || cooldown > 0}
              onClick={() => void submitResetRequest(identifier)}
              className="w-full h-12 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi lại...
                </>
              ) : cooldown > 0 ? (
                `Gửi lại sau ${cooldown}s`
              ) : (
                "Gửi lại email"
              )}
            </Button>

            <Link
              href="/login"
              className="block text-center text-caption font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Quên mật khẩu?"
      subtitle="Nhập tên đăng nhập hoặc email để nhận liên kết đặt lại mật khẩu."
      backHref="/login"
      backLabel="Quay lại đăng nhập"
    >
      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Tài khoản"
              name="identifier"
              type="text"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                if (error) setError(undefined);
              }}
              placeholder="Tên đăng nhập hoặc Email"
              required
              disabled={isSubmitting}
              error={error}
              className="pl-11"
            />
            <Mail className="absolute left-4 top-[38px] h-4 w-4 text-text-muted" />
          </div>
        </div>

        <div className="rounded-2xl bg-bg-base p-5 shadow-xs space-y-2">
          <p className="label-base">Cách hoạt động</p>
          <p className="text-sm text-text-secondary">
            Nếu bạn nhập tên đăng nhập nội bộ, hệ thống sẽ tự quy đổi sang email
            công ty tương ứng như{" "}
            <span className="font-semibold text-text-primary">
              {identifier.trim()
                ? normalizeAuthIdentifier(identifier)
                : "tenban@moodwedding.com"}
            </span>
            .
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-sm uppercase tracking-widest font-bold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang gửi email...
            </>
          ) : (
            "Gửi liên kết đặt lại"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
