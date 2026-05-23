"use client";

import { AlertTriangle, Clock3, TimerReset } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { formatVnd } from "@/components/finance/finance-format";
import type { DebtStats } from "@/app/actions/finance-operations-queries";

interface Props {
  stats: DebtStats;
}

interface AgingBucketItem {
  label: string;
  value: number;
  variant: BadgeVariant;
  icon: typeof Clock3;
}

const BUCKET_META: Array<{
  key: keyof DebtStats["aging"];
  label: string;
  variant: BadgeVariant;
  icon: typeof Clock3;
}> = [
  { key: "not_due", label: "Chưa đến hạn", variant: "success", icon: TimerReset },
  { key: "days_1_30", label: "1-30 ngày", variant: "warning", icon: Clock3 },
  { key: "days_31_60", label: "31-60 ngày", variant: "accent", icon: Clock3 },
  { key: "days_61_90", label: "61-90 ngày", variant: "primary", icon: AlertTriangle },
  { key: "over_90", label: "> 90 ngày", variant: "error", icon: AlertTriangle },
];

export function DebtAgingCard({ stats }: Props) {
  if (!stats || !stats.aging) return null;

  const total = Object.values(stats.aging).reduce((sum, value) => sum + value, 0);
  const items: AgingBucketItem[] = BUCKET_META.map((item) => ({
    label: item.label,
    value: stats.aging[item.key] || 0,
    variant: item.variant,
    icon: item.icon,
  }));

  return (
    <div className="card-base p-5">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-h3">Phân tích tuổi nợ</h3>
          <p className="text-caption text-text-muted">Tổng dư nợ đang theo dõi: {formatVnd(total)}</p>
        </div>
        <Badge variant={stats.overdue > 0 ? "warning" : "success"}>
          Quá hạn {formatVnd(stats.overdue)}
        </Badge>
      </div>

      <div className="hidden gap-3 lg:grid lg:grid-cols-3 2xl:grid-cols-5">
        {items.map((item) => (
          <AgingBucketCard key={item.label} item={item} total={total} compact={false} />
        ))}
      </div>

      <div className="space-y-2 lg:hidden">
        {items.map((item) => (
          <AgingBucketCard key={item.label} item={item} total={total} compact />
        ))}
      </div>
    </div>
  );
}

function AgingBucketCard({
  item,
  total,
  compact,
}: {
  item: AgingBucketItem;
  total: number;
  compact: boolean;
}) {
  const Icon = item.icon;
  const share = total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0;

  if (compact) {
    return (
      <div className="card-base p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="icon-box bg-bg-hover">
              <Icon className="h-4 w-4 text-text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-body-sm font-semibold text-text-primary">{item.label}</p>
              <p className="text-caption text-text-muted">{share}% tổng dư nợ</p>
            </div>
          </div>
          <Badge variant={item.variant}>{share}%</Badge>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-caption text-text-muted">Giá trị</p>
          <p className="finance-figure text-body font-bold text-text-primary">{formatVnd(item.value)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="icon-box bg-bg-hover">
          <Icon className="h-4 w-4 text-text-secondary" />
        </div>
        <Badge variant={item.variant}>{share}%</Badge>
      </div>

      <div className="mb-4 space-y-1">
        <p className="text-body-sm font-semibold text-text-primary">{item.label}</p>
        <p className="text-caption text-text-muted">{share}% tổng dư nợ</p>
      </div>

      <div className="space-y-1">
        <p className="text-caption text-text-muted">Giá trị</p>
        <p className="finance-figure text-h3 text-text-primary">{formatVnd(item.value)}</p>
      </div>
    </div>
  );
}
