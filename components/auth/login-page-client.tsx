"use client";

import { useState, useEffect, type FormEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login, signInWithGoogleAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import LoginTransition from "@/components/auth/login-transition";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast-manager";
import { TOAST_MESSAGES } from "@/lib/toast-messages";
import { cn } from "@/lib/utils";

type LoginState = "idle" | "transitioning" | "navigating";

export default function LoginPageClient() {
  const router = useRouter();
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const [showPassword, setShowPassword] = useState(false);

  // 1. Surface one-time auth/recovery redirects
  useEffect(() => {
    const url = new URL(window.location.href);
    const resetStatus = url.searchParams.get("reset");
    const authError = url.searchParams.get("error");

    if (!resetStatus && !authError) return;

    if (resetStatus === "success") {
      toast.success(TOAST_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS);
    } else if (authError === "auth_failed") {
      toast.error(TOAST_MESSAGES.AUTH.AUTH_LINK_INVALID);
    }

    url.searchParams.delete("reset");
    url.searchParams.delete("error");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, []);

  // 2. Login handler
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginState !== "idle") return;

    const formData = new FormData(event.currentTarget);
    flushSync(() => {
      setLoginState("transitioning");
    });

    const result = await login(formData);

    if ("error" in result) {
      setLoginState("idle");
      toast.error(result.error);
    } else {
      setLoginState("navigating");
      router.replace("/dashboard");
    }
  };

  const handleGoogleLogin = async () => {
    if (loginState !== "idle") return;
    flushSync(() => {
      setLoginState("transitioning");
    });
    
    const result = await signInWithGoogleAction();
    if (result?.error) {
      setLoginState("idle");
      toast.error(result.error);
    }
    // Note: On success, signInWithGoogleAction redirects to Google, so we don't clear transition state
  };

  const isLoading = loginState === "transitioning" || loginState === "navigating";
  const submitLabel =
    loginState === "transitioning"
      ? "Đang xác thực"
      : loginState === "navigating"
        ? "Đang mở hệ thống"
        : "Đăng nhập";

  return (
    <>
      <LoginTransition isVisible={isLoading} state={loginState === "navigating" ? "navigating" : "transitioning"} />

      <div className="login-root min-h-dvh grid grid-cols-1 lg:grid-cols-5 bg-white lg:bg-bg-base overflow-hidden">
        {/* Left Side: Brand Experience (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-3 relative h-full">
          <Image
            alt="Mood Studio Premium Wedding"
            className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] brightness-[0.85]"
            src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop"
            fill
            priority
          />
          {/* Overlay mask with primary tint */}
          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-linear-to-t from-dark/80 via-dark/20 to-transparent" />
          
          <div className="absolute bottom-16 left-16 text-white max-w-xl animate-in slide-in-from-left duration-700">
            <h3 className="text-5xl font-light tracking-tight leading-tight whitespace-nowrap">
              Capturing Timeless Moments With <span className="font-semibold">Mood.</span>
            </h3>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-px w-12 bg-white/40" />
              <p className="text-white/70 font-medium tracking-[0.2em] text-caption uppercase">
                Premium Wedding SaaS Solution
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="col-span-1 lg:col-span-2 min-h-dvh lg:h-screen bg-white flex flex-col justify-between lg:justify-center relative shadow-none lg:shadow-2xl z-10 overflow-y-auto">
          <div className="w-full max-w-[420px] mx-auto px-8 md:px-12 py-12 lg:py-16 space-y-10 lg:space-y-12">
            <div className="space-y-10 lg:space-y-12">
              {/* Logo/Branding */}
              <header className="flex flex-col items-center space-y-6">
                <div className="relative group transition-transform duration-500 hover:scale-105">
                  <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <Image
                      src="/logo.png"
                      alt="Mood Studio"
                      width={80}
                      height={80}
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
                <div className="text-center space-y-1 w-full flex flex-col items-center">
                  <h1 className="text-h1 block w-full">Mood Studio</h1>
                  <p className="text-caption font-bold text-text-muted uppercase tracking-[0.5em] block w-full">Hệ thống Quản lý V2</p>
                </div>
              </header>

              {/* Welcome Text */}
              <div className="space-y-2 text-center w-full">
                <h2 className="text-h2 block w-full">Chào mừng trở lại</h2>
                <p className="text-sm text-text-secondary block w-full">Vui lòng đăng nhập để bắt đầu công việc</p>
              </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isLoading}>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    label="Tài khoản"
                    name="email"
                    placeholder="Tên đăng nhập hoặc Email"
                    type="text"
                    required
                    disabled={isLoading}
                    className="pl-11"
                  />
                  <Mail className="absolute left-4 top-[38px] w-4 h-4 text-text-muted" />
                </div>

                <div className="relative">
                  <div className="flex justify-between items-center px-1 absolute right-0 top-0">
                    <Link
                      href="/forgot-password"
                      className="text-caption font-bold text-primary/70 hover:text-primary transition-colors"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <Input
                    label="Mật khẩu"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    className="pl-11 pr-12"
                  />
                  <Lock className="absolute left-4 top-[38px] w-4 h-4 text-text-muted" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[38px] !p-0 !h-auto !w-auto text-text-muted hover:text-text-primary hover:bg-transparent transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Extras */}
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <Checkbox name="rememberMe" defaultChecked />
                    <svg className="absolute w-3 h-3 text-primary hidden peer-checked:block pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {/* Submit */}
              <Button type="submit" disabled={isLoading} className="w-full h-12 text-sm uppercase tracking-widest font-bold relative overflow-hidden group/btn">
                <div className={cn(
                  "flex items-center justify-center gap-2 transition-all duration-300",
                  "opacity-100 scale-100"
                )}>
                  {submitLabel}
                </div>
                {isLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider font-semibold">
                  <span className="bg-white px-3 text-text-muted">Hoặc</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={handleGoogleLogin}
                className="w-full h-12 text-sm font-semibold relative overflow-hidden group/btn bg-white hover:bg-bg-hover text-text-primary border-border"
              >
                <div className={cn(
                  "flex items-center justify-center gap-2 transition-all duration-300",
                  "opacity-100 scale-100"
                )}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Đăng nhập bằng Google
                </div>
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="pb-[max(2rem,calc(env(safe-area-inset-bottom)+0.5rem))] lg:pb-12 text-center space-y-6">
              <p className="text-caption font-medium text-text-muted">
                Bạn chưa có quyền truy cập?{" "}
                <a href="https://zalo.me/0976317031" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                  Liên hệ Quản trị viên
                </a>
              </p>
              
              <div className="flex items-center justify-center gap-2">
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="h-1.5 w-1.5 rounded-full bg-border-dark" />
                <div className="h-1 w-1 rounded-full bg-border" />
              </div>
            </footer>
        </div>
      </div>
    </>
  );
}
