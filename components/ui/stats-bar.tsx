/* eslint-disable react/forbid-elements -- SSOT UI component (stats bar) uses native buttons internally */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "primary" | "success" | "error" | "info" | "neutral" | "accent";

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  iconBg?: string;
  iconColor?: string;
  tone?: StatTone;
  active?: boolean;
  trend?: number;
  onClick?: () => void;
}

export interface StatsBarProps {
  items: StatItem[];
  className?: string;
  showDividers?: boolean;
}

const TONE_STYLES: Record<StatTone, { iconBg: string; iconColor: string; activeText: string }> = {
  primary: { iconBg: "bg-primary/10", iconColor: "text-primary", activeText: "text-primary" },
  success: { iconBg: "bg-success/10", iconColor: "text-success", activeText: "text-success" },
  error: { iconBg: "bg-error/10", iconColor: "text-error", activeText: "text-error" },
  info: { iconBg: "bg-info/10", iconColor: "text-info", activeText: "text-info" },
  neutral: { iconBg: "bg-bg-hover", iconColor: "text-text-secondary", activeText: "text-text-primary" },
  accent: { iconBg: "bg-accent/15", iconColor: "text-accent", activeText: "text-accent" },
};

function toSentenceLabel(label: string) {
  if (!label) return label;
  return label.charAt(0).toLocaleUpperCase("vi-VN") + label.slice(1);
}

export function StatsBar({ items, className, showDividers = true }: StatsBarProps) {
  return (
    <div className={cn("min-w-0 flex-1 overflow-hidden", className)}>
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide lg:gap-5">
        {items.map((item, index) => {
          const tone = TONE_STYLES[item.tone || "primary"];
          const iconBg = item.iconBg || tone.iconBg;
          const iconColor = item.iconColor || tone.iconColor;
          const wrapperClassName = cn(
            "group/stat flex items-center gap-3 shrink-0 rounded-[var(--radius-lg)] px-2 py-1.5 transition-all",
            item.active && "bg-bg-card shadow-sm ring-1 ring-border/70",
            item.onClick && !item.active && "cursor-pointer hover:bg-bg-hover/70 hover:ring-1 hover:ring-border/50",
          );
          const content = (
            <>
              {showDividers && index > 0 && <div className="mr-1 h-6 w-px bg-text-muted/20" />}
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg lg:h-9 lg:w-9", iconBg)}>
                <item.icon className={cn("h-4 w-4 lg:h-[18px] lg:w-[18px]", iconColor)} />
              </div>
              <span
                className={cn(
                  "text-body font-bold",
                  item.active ? tone.activeText : "text-text-main",
                  item.onClick && !item.active && "group-hover/stat:text-text-primary"
                )}
              >
                {item.value}
              </span>
              <span
                className={cn(
                  "text-body-sm",
                  item.active ? tone.activeText : "text-text-muted",
                  item.onClick && !item.active && "group-hover/stat:text-text-secondary"
                )}
              >
                {toSentenceLabel(item.label)}
              </span>
              {item.trend !== undefined && item.trend !== 0 && (
                <span className={cn("text-caption font-semibold", item.trend > 0 ? "text-success" : "text-error")}>
                  {item.trend > 0 ? "+" : ""}
                  {item.trend}%
                </span>
              )}
            </>
          );

          if (item.onClick) {
            return (
              <button key={item.label} type="button" onClick={item.onClick} className={wrapperClassName}>
                {content}
              </button>
            );
          }

          return (
            <div key={item.label} className={wrapperClassName}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
