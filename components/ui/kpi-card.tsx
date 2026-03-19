import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function KPICard({
  label,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  trend,
  trendUp,
  className,
}: KPICardProps) {
  return (
    <div className={cn("stats-card", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("icon-box", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {trend && (
          <span
            className={cn(
              "text-caption font-bold",
              trendUp ? "text-success" : "text-error"
            )}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      <p className="text-label mb-1">{label}</p>
      <p className="text-h2">{value}</p>
    </div>
  );
}
