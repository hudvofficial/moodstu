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
      label: "Chờ gửi lab",
      value: String(stats.choXuLy), // ADR-014: không còn "đã đặt cọc" ở đơn in
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
      label: "Đang ở lab",
      value: String(stats.daIn), // da_in = lab đã in xong, hình vẫn ở bên lab (ADR-014)
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
