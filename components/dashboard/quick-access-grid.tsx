"use client";

import Link from "next/link";
import { MODULES } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Màu pastel cho từng module — opaque bg + shadow tạo chiều sâu (mcoffe pattern) */
const MODULE_COLORS: Record<string, { bg: string; text: string }> = {
  contracts:    { bg: "bg-amber-50",    text: "text-amber-700" },
  calendar:     { bg: "bg-blue-50",     text: "text-blue-600" },
  crm:          { bg: "bg-orange-50",   text: "text-orange-600" },
  finance:      { bg: "bg-emerald-50",  text: "text-emerald-600" },
  printing:     { bg: "bg-pink-50",     text: "text-pink-600" },
  reports:      { bg: "bg-purple-50",   text: "text-purple-600" },
  productivity: { bg: "bg-teal-50",     text: "text-teal-600" },
  services:     { bg: "bg-indigo-50",   text: "text-indigo-600" },
  inventory:    { bg: "bg-cyan-50",     text: "text-cyan-600" },
  dresses:      { bg: "bg-rose-50",     text: "text-rose-600" },
  employees:    { bg: "bg-slate-100",   text: "text-slate-600" },
  settings:     { bg: "bg-stone-100",   text: "text-stone-600" },
  moodie:       { bg: "bg-violet-50",   text: "text-violet-600" },
};

const DEFAULT_COLOR = { bg: "bg-primary/10", text: "text-primary" };

/** Grid shortcuts — chỉ hiện trên mobile (lg:hidden) */
export function QuickAccessGrid() {
  return (
    <div className="lg:hidden">
      <div className="grid grid-cols-5 gap-2">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const color = MODULE_COLORS[mod.id] || DEFAULT_COLOR;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="flex flex-col items-center gap-1.5 py-2 rounded-lg group"
            >
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                "shadow-md",
                "group-active:scale-90 transition-all duration-200",
                color.bg
              )}>
                <Icon className={cn("w-6 h-6", color.text)} />
              </div>
              <span className="text-caption text-center leading-tight line-clamp-1">
                {mod.shortLabel || mod.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
