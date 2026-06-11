"use client";

import Link from "next/link";
import { MODULES } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { canAccess, type Role } from "@/types/roles";

const MODULE_COLORS: Record<string, { bg: string; text: string }> = {
  contracts: { bg: "bg-amber-50", text: "text-amber-700" },
  calendar: { bg: "bg-blue-50", text: "text-blue-600" },
  crm: { bg: "bg-orange-50", text: "text-orange-600" },
  finance: { bg: "bg-emerald-50", text: "text-emerald-600" },
  printing: { bg: "bg-pink-50", text: "text-pink-600" },
  reports: { bg: "bg-purple-50", text: "text-purple-600" },
  productivity: { bg: "bg-teal-50", text: "text-teal-600" },
  services: { bg: "bg-indigo-50", text: "text-indigo-600" },
  inventory: { bg: "bg-cyan-50", text: "text-cyan-600" },
  dresses: { bg: "bg-rose-50", text: "text-rose-600" },
  employees: { bg: "bg-slate-100", text: "text-slate-600" },
  settings: { bg: "bg-stone-100", text: "text-stone-600" },
  moodie: { bg: "bg-violet-50", text: "text-violet-600" },
  salaries: { bg: "bg-green-50", text: "text-green-600" },
  goals: { bg: "bg-sky-50", text: "text-sky-600" },
};

const DEFAULT_COLOR = { bg: "bg-primary/10", text: "text-primary" };

interface QuickAccessGridProps {
  role: Role;
}

export function QuickAccessGrid({ role }: QuickAccessGridProps) {
  const modules = MODULES.filter((mod) => canAccess(role, mod.id));

  if (modules.length === 0) return null;

  return (
    <div className="lg:hidden">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] md:gap-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const color = MODULE_COLORS[mod.id] || DEFAULT_COLOR;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="flex flex-col items-center gap-1.5 rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-bg-hover active:bg-bg-hover transition-colors"
            >
              <div
                className={cn(
                  "flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl shadow-md",
                  "transition-all duration-200 group-active:scale-90",
                  color.bg,
                )}
              >
                <Icon className={cn("h-6 w-6 md:h-7 md:w-7", color.text)} />
              </div>
              <span className="line-clamp-1 text-center text-caption leading-tight">
                {mod.shortLabel || mod.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
