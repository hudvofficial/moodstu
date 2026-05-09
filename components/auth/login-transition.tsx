"use client";

import Image from "next/image";

interface LoginTransitionProps {
  isVisible: boolean;
  state: "transitioning" | "navigating";
}

export default function LoginTransition({ isVisible, state }: LoginTransitionProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-bg-base/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-card shadow-xs">
              <Image
                src="/logo.png"
                alt=""
                aria-hidden="true"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-h3">
            {state === "transitioning" ? "Đang xác thực..." : "Chuẩn bị vào hệ thống..."}
          </p>
          <p className="text-sm text-text-secondary animate-pulse">
            Vui lòng đợi trong giây lát
          </p>
        </div>
      </div>
    </div>
  );
}

export function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base">
      <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary/40 animate-spin" />
    </div>
  );
}
