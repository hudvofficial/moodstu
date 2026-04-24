import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

const SUPPORT_LINK = "https://zalo.me/0976317031";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export default function AuthShell({
  title,
  subtitle,
  children,
  backHref,
  backLabel,
}: AuthShellProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5 bg-white lg:bg-bg-base overflow-hidden">
      <div className="hidden lg:block lg:col-span-3 relative h-full">
        <Image
          alt="Mood Studio Premium Wedding"
          className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] brightness-[0.85]"
          src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop"
          fill
          priority
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-linear-to-t from-dark/80 via-dark/20 to-transparent" />

        <div className="absolute bottom-16 left-16 text-white max-w-xl animate-in slide-in-from-left duration-700">
          <h3 className="text-5xl font-light tracking-tight leading-tight whitespace-nowrap">
            Capturing Timeless Moments With{" "}
            <span className="font-semibold">Mood.</span>
          </h3>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px w-12 bg-white/40" />
            <p className="text-white/70 font-medium tracking-[0.2em] text-caption uppercase">
              Premium Wedding SaaS Solution
            </p>
          </div>
        </div>
      </div>

      <div className="col-span-1 lg:col-span-2 min-h-screen lg:h-screen bg-white flex flex-col justify-between lg:justify-center relative shadow-none lg:shadow-2xl z-10 overflow-y-auto">
        <div className="w-full max-w-[420px] mx-auto px-8 md:px-12 py-12 lg:py-16 space-y-10 lg:space-y-12">
          <div className="space-y-10 lg:space-y-12">
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
                <p className="text-caption font-bold text-text-muted uppercase tracking-[0.5em] block w-full">
                  Hệ thống Quản lý V2
                </p>
              </div>
            </header>

            <div className="space-y-3 text-center w-full">
              {backHref && backLabel ? (
                <div className="flex justify-center">
                  <Link
                    href={backHref}
                    className="text-caption font-bold text-primary/70 hover:text-primary transition-colors"
                  >
                    {backLabel}
                  </Link>
                </div>
              ) : null}

              <div className="space-y-2">
                <h2 className="text-h2 block w-full">{title}</h2>
                <p className="text-sm text-text-secondary block w-full">
                  {subtitle}
                </p>
              </div>
            </div>

            {children}
          </div>
        </div>

        <footer className="pb-8 lg:pb-12 text-center space-y-6">
          <p className="text-caption font-medium text-text-muted">
            Bạn chưa có quyền truy cập?{" "}
            <a
              href={SUPPORT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary hover:underline"
            >
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
  );
}
