"use client";

import {
  CircleDollarSign,
  AlertCircle,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import { formatVnd } from "@/lib/utils";
import type { PrintingStats } from "@/types/printing";

interface Props {
  stats: PrintingStats;
  /** Mobile compact: only show critical metrics */
  compact?: boolean;
}

export default function PrintingStatsBar({ stats, compact }: Props) {
  // V2: Key business metrics only (no duplicate with tabs)
  const keyMetrics: StatItem[] = [
    {
      icon: CircleDollarSign,
      label: "Công nợ",
      value: formatVnd(stats.unpaidCost),
      iconBg: "bg-error/10",
      iconColor: "text-error",
    },
    {
      icon: AlertCircle,
      label: "Cần xử lý",
      value: String(stats.choXuLy + stats.datCoc), // Urgent: chờ xử lý + đã đặt cọc
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      icon: CheckCircle2,
      label: "Hoàn thành",
      value: String(stats.hoanThanh),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: Truck,
      label: "Sẵn sàng giao",
      value: String(stats.daIn + stats.daGiao), // Ready: đã in + đã giao
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  // Mobile compact: only show debt + urgent (2 most critical)
  const items = compact
    ? keyMetrics.filter((i) => i.label === "Công nợ" || i.label === "Cần xử lý")
    : keyMetrics;

  return <StatsBar items={items} />;
}
