"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/lib/toast-manager";
import AuthShell from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { resetPasswordSchema } from "@/lib/validations/auth.schema";

type RecoveryStatus = "checking" | "ready" | "invalid" | "submitting";
type FormErrors = Partial<Record<"password" | "confirmPassword", string>>;

function cleanRecoveryUrl() {
  const url = new URL(window.location.href);
  const transientParams = [
    "code",
    "type",
    "token_hash",
    "error",
    "error_code",
    "error_description",
  ];

  transientParams.forEach((key) => url.searchParams.delete(key));
  url.hash = "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

function mapRecoveryLinkError(rawMessage?: string | null): string {
  if (!rawMessage) {
    return "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";
  }

  const message = decodeURIComponent(rawMessage).toLowerCase();

  if (message.includes("expired")) {
    return "Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu email mới.";
  }

  if (message.includes("invalid")) {
    return "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã bị dùng rồi.";
  }

  if (message.includes("otp") || message.includes("token")) {
    return "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã bị dùng rồi.";
  }

  return "Không thể xác thực yêu cầu đặt lại mật khẩu. Vui lòng thử lại.";
}

function mapPasswordUpdateError(rawMessage?: string | null): string {
  if (!rawMessage) {
    return "Không thể cập nhật mật khẩu. Vui lòng thử lại.";
  }

  const message = rawMessage.toLowerCase();

  if (message.includes("same password")) {
    return "Mật khẩu mới phải khác mật khẩu hiện tại.";
  }

  if (message.includes("session") || message.includes("jwt")) {
    return "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu email mới.";
  }

  return "Không thể cập nhật mật khẩu. Vui lòng thử lại.";
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [statusMessage, setStatusMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isMounted = true;

    const bootstrapRecoverySession = async () => {
      const url = new URL(window.location.href);
      const queryParams = url.searchParams;
      const code = queryParams.get("code");
      const queryError = queryParams.get("error");
      const queryErrorDescription = queryParams.get("error_description");
      const supabase = createClient();
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash,
      );
      const hashErrorDescription = hashParams.get("error_description");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (queryError || queryErrorDescription || hashErrorDescription) {
        if (!isMounted) return;
        setStatus("invalid");
        setStatusMessage(
          mapRecoveryLinkError(
            queryErrorDescription ?? hashErrorDescription ?? queryError,
          ),
        );
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          if (!isMounted) return;
          setStatus("invalid");
          setStatusMessage(mapRecoveryLinkError(error.message));
          return;
        }

        cleanRecoveryUrl();
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          if (!isMounted) return;
          setStatus("invalid");
          setStatusMessage(mapRecoveryLinkError(error.message));
          return;
        }

        cleanRecoveryUrl();
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error || !session) {
        setStatus("invalid");
        setStatusMessage(
          error
            ? mapRecoveryLinkError(error.message)
            : "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
        );
        return;
      }

      setStatus("ready");
    };

    void bootstrapRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (formData: FormData) => {
    const nextPassword = String(formData.get("password") ?? "");
    const nextConfirmPassword = String(formData.get("confirmPassword") ?? "");
    const parsed = resetPasswordSchema.safeParse({
      password: nextPassword,
      confirmPassword: nextConfirmPassword,
    });

    if (!parsed.success) {
      setErrors({
        password: parsed.error.flatten().fieldErrors.password?.[0],
        confirmPassword:
          parsed.error.flatten().fieldErrors.confirmPassword?.[0],
      });
      return;
    }

    setErrors({});
    setStatus("submitting");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      setStatus("ready");
      const message = mapPasswordUpdateError(error.message);
      toast.error(message);
      setStatusMessage(message);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?reset=success");
  };

  if (status === "checking") {
    return (
      <AuthShell
        title="Đặt lại mật khẩu"
        subtitle="Đang xác thực liên kết khôi phục tài khoản."
        backHref="/login"
        backLabel="Quay lại đăng nhập"
      >
        <div className="rounded-3xl bg-bg-base p-8 shadow-xs text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full border-4 border-primary/15 border-t-primary animate-spin" />
          <p className="text-body-sm text-text-secondary">
            Vui lòng đợi trong giây lát...
          </p>
        </div>
      </AuthShell>
    );
  }

  if (status === "invalid") {
    return (
      <AuthShell
        title="Liên kết không hợp lệ"
        subtitle="Liên kết khôi phục đã hết hạn hoặc không còn hiệu lực."
        backHref="/login"
        backLabel="Quay lại đăng nhập"
      >
        <div className="space-y-6">
          <div className="rounded-3xl bg-bg-base p-6 shadow-xs text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <p className="text-body-sm text-text-secondary">
              {statusMessage}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/forgot-password"
              className="btn btn-primary px-5 py-2.5 w-full h-12 text-sm font-bold flex items-center justify-center"
            >
              Yêu cầu email mới
            </Link>

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

  const isSubmitting = status === "submitting";

  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      subtitle="Nhập mật khẩu mới để hoàn tất quá trình khôi phục tài khoản."
      backHref="/login"
      backLabel="Quay lại đăng nhập"
    >
      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Mật khẩu mới"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) {
                  setErrors((current) => ({ ...current, password: undefined }));
                }
              }}
              placeholder="Nhập mật khẩu mới"
              required
              disabled={isSubmitting}
              error={errors.password}
              className="pl-11 pr-12"
            />
            <Lock className="absolute left-4 top-[38px] h-4 w-4 text-text-muted" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-[38px] !p-0 !h-auto !w-auto text-text-muted hover:text-text-primary hover:bg-transparent transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="relative">
            <Input
              label="Nhập lại mật khẩu"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (errors.confirmPassword) {
                  setErrors((current) => ({
                    ...current,
                    confirmPassword: undefined,
                  }));
                }
              }}
              placeholder="Xác nhận mật khẩu mới"
              required
              disabled={isSubmitting}
              error={errors.confirmPassword}
              className="pl-11 pr-12"
            />
            <Lock className="absolute left-4 top-[38px] h-4 w-4 text-text-muted" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-4 top-[38px] !p-0 !h-auto !w-auto text-text-muted hover:text-text-primary hover:bg-transparent transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-bg-base p-5 shadow-xs space-y-2">
          <p className="label-base">Yêu cầu mật khẩu</p>
          <p className="text-sm text-text-secondary">
            Mật khẩu cần có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ cái và 1
            chữ số.
          </p>
          {statusMessage ? (
            <p className="text-caption text-error">{statusMessage}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-sm uppercase tracking-widest font-bold relative overflow-hidden"
        >
          <div
            className={cn(
              "flex items-center justify-center gap-2 transition-all duration-300",
              isSubmitting ? "opacity-0 scale-95" : "opacity-100 scale-100",
            )}
          >
            Cập nhật mật khẩu
          </div>

          {isSubmitting ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          ) : null}
        </Button>
      </form>
    </AuthShell>
  );
}
