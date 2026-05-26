"use client";

import { type StatItem } from "@/components/ui/stats-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════
// Mobile Stats — Extracted from gallery-toolbar
// Primary card (2-col grid) + Secondary chip
// ═══════════════════════════════════════════

type MobileStatTone = NonNullable<StatItem["tone"]>;

export const MOBILE_STAT_STYLES: Record<MobileStatTone, { iconBg: string; iconColor: string; activeBg: string; activeText: string }> = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    activeBg: "border-primary/25 bg-primary/5 shadow-primary/10",
    activeText: "text-primary",
  },
  success: {
    iconBg: "bg-success/10",
    iconColor: "text-success",
    activeBg: "border-success/25 bg-success/5 shadow-success/10",
    activeText: "text-success",
  },
  error: {
    iconBg: "bg-error/10",
    iconColor: "text-error",
    activeBg: "border-error/25 bg-error/5 shadow-error/10",
    activeText: "text-error",
  },
  info: {
    iconBg: "bg-info/10",
    iconColor: "text-info",
    activeBg: "border-info/25 bg-info/5 shadow-info/10",
    activeText: "text-info",
  },
  neutral: {
    iconBg: "bg-bg-hover",
    iconColor: "text-text-secondary",
    activeBg: "border-border bg-bg-hover shadow-none",
    activeText: "text-text-main",
  },
  accent: {
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    activeBg: "border-accent/25 bg-accent/5 shadow-accent/10",
    activeText: "text-accent",
  },
  warning: {
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    activeBg: "border-warning/25 bg-warning/5 shadow-warning/10",
    activeText: "text-warning",
  },
};

export function MobilePrimaryStatCard({ item }: { item: StatItem }) {
  const tone = MOBILE_STAT_STYLES[item.tone || "primary"];

  return (
    <Button
      unstyled
      type="button"
      onClick={item.onClick}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        item.active ? cn("shadow-sm", tone.activeBg) : "border-border/70 bg-elevated/80 hover:bg-bg-hover"
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.iconBg || tone.iconBg)}>
        <item.icon className={cn("h-4 w-4", item.iconColor || tone.iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-body font-bold leading-none truncate", item.active ? tone.activeText : "text-text-main")}>
          {item.value}
        </div>
        <div className={cn("mt-1 text-caption leading-none truncate", item.active ? tone.activeText : "text-text-muted")}>
          {item.label}
        </div>
      </div>
    </Button>
  );
}

export function MobileSecondaryStatChip({ item }: { item: StatItem }) {
  const tone = MOBILE_STAT_STYLES[item.tone || "primary"];

  return (
    <Button
      unstyled
      type="button"
      onClick={item.onClick}
      className={cn(
        "inline-flex h-8 whitespace-nowrap items-center gap-1.5 rounded-full border px-3 text-caption font-semibold transition-colors",
        item.active
          ? tone.activeBg
          : "border-border/70 bg-elevated/70 text-text-secondary hover:bg-bg-hover hover:text-text-main"
      )}
    >
      <item.icon className={cn("h-3.5 w-3.5", item.iconColor || tone.iconColor)} />
      <span className={item.active ? tone.activeText : "text-text-main"}>{item.value}</span>
      <span className={item.active ? tone.activeText : "text-text-muted"}>{item.label}</span>
    </Button>
  );
}
