// ═══════════════════════════════════════════
// StatsBar — Shared inline stats component (SSOT)
// Used by: contracts/compact-stats, employees/employee-stats-bar
// Unified compact bar: icon + value + label + dividers
// Horizontal scroll on mobile, inline on desktop
// ═══════════════════════════════════════════

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  iconBg?: string;
  iconColor?: string;
  trend?: number;
  onClick?: () => void;
}

export interface StatsBarProps {
  items: StatItem[];
  className?: string;
}

export function StatsBar({
  items,
  className,
}: StatsBarProps) {
  return (
    <div className={cn("min-w-0 flex-1 overflow-hidden", className)}>
      {/* ── Unified compact bar — all viewports ── */}
      <div className="flex items-center gap-4 lg:gap-5 overflow-x-auto scrollbar-hide">
        {items.map((item, i) => {
          const content = (
            <>
              {i > 0 && <div className="w-px h-6 bg-text-muted/20 mr-1" />}
              <div
                className={`flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-lg ${item.iconBg || "bg-primary/10"}`}
              >
                <item.icon
                  className={`w-4 h-4 lg:w-4.5 lg:h-4.5 ${item.iconColor || "text-primary"}`}
                />
              </div>
              <span className="text-body font-bold text-text-main">
                {item.value}
              </span>
              <span className="text-sm text-text-muted">{item.label}</span>
              {item.trend !== undefined && item.trend !== 0 && (
                <span
                  className={`text-xs font-semibold ${
                    item.trend > 0 ? "text-success" : "text-error"
                  }`}
                >
                  {item.trend > 0 ? "+" : ""}
                  {item.trend}%
                </span>
              )}
            </>
          );

          return item.onClick ? (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="flex items-center gap-3 shrink-0 cursor-pointer rounded-lg px-1 -mx-1 transition-colors hover:bg-bg-hover"
            >
              {content}
            </button>
          ) : (
            <div key={item.label} className="flex items-center gap-3 shrink-0">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
