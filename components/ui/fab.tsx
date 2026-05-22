// ═══════════════════════════════════════════
// FAB — Shared Floating Action Button (SSOT)
// Mobile-only (lg:hidden), fixed bottom-right
// Used by: contracts, employees, + future modules
// ═══════════════════════════════════════════

"use client";

import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

interface FABProps {
  icon?: LucideIcon;
  onClick: () => void;
  label?: string;
  className?: string;
  wrapperClassName?: string;
}

export function FAB({ icon: Icon = Plus, onClick, label = "Tạo mới", className, wrapperClassName }: FABProps) {
  return (
    <div className={cn("lg:hidden fixed bottom-24 right-4 z-40", wrapperClassName)}>
      {/* eslint-disable-next-line react/forbid-elements -- FAB is an SSOT primitive, bypasses global .btn shape */}
      <button
        onClick={() => {
          haptic("medium");
          onClick();
        }}
        aria-label={label}
        className={cn(
          "flex items-center justify-center size-12 !rounded-full bg-primary text-text-inverse shadow-float hover:scale-105 active:scale-95 transition-all outline-none border-none cursor-pointer",
          className
        )}
        style={{ borderRadius: "50%" }}
      >
        <Icon className="w-6 h-6" />
      </button>
    </div>
  );
}
