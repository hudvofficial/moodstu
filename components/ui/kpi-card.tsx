import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  trendUp?: boolean;
  href?: string;
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
  href,
  className,
}: KPICardProps) {
  const content = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className={cn("icon-box", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        {trend ? (
          <span
            className={cn(
              "shrink-0 text-caption font-bold",
              trendUp ? "text-success" : "text-error",
            )}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        ) : null}
      </div>
      <p className="mb-1 text-label">{label}</p>
      <p className="text-h2">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "stats-card block transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn("stats-card", className)}>{content}</div>;
}
