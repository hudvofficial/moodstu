// ═══════════════════════════════════════════
// FAB — Shared Floating Action Button (SSOT)
// Mobile-only (lg:hidden), fixed bottom-right
// Used by: contracts, employees, + future modules
// ═══════════════════════════════════════════

import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABProps {
  icon?: LucideIcon;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function FAB({ icon: Icon = Plus, onClick, label = "Tạo mới", className }: FABProps) {
  return (
    <div className="lg:hidden fixed bottom-24 right-4 z-40">
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          "flex items-center justify-center size-12 rounded-full bg-primary text-text-inverse shadow-lg hover:opacity-90 active:scale-95 transition-all",
          className
        )}
      >
        <Icon className="w-5 h-5" />
      </button>
    </div>
  );
}
