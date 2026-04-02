"use client";

import {
  CircleDollarSign,
  Printer,
  Clock3,
  PackageCheck,
  ScanLine,
  Truck,
} from "lucide-react";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import { formatCurrency } from "@/lib/utils";
import type { PrintingStats } from "@/types/printing";

interface Props {
  stats: PrintingStats;
  /** Mobile compact: only show 2 key metrics */
  compact?: boolean;
}

export default function PrintingStatsBar({ stats, compact }: Props) {
  const allItems: StatItem[] = [
    {
      icon: Printer,
      label: "Tổng đơn",
      value: String(stats.total),
    },
    {
      icon: Clock3,
      label: "Chờ xử lý",
      value: String(stats.choXuLy),
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      icon: ScanLine,
      label: "Đang in",
      value: String(stats.dangIn),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
    {
      icon: PackageCheck,
      label: "Đã in",
      value: String(stats.daIn),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: Truck,
      label: "Đã nhận",
      value: String(stats.daNhan),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: CircleDollarSign,
      label: "Công nợ",
      value: formatCurrency(stats.unpaidCost),
      iconBg: "bg-error/10",
      iconColor: "text-error",
    },
  ];

  // Mobile compact: only show total + unpaid debt (2 key metrics)
  const items = compact
    ? allItems.filter((i) => i.label === "Tổng đơn" || i.label === "Công nợ")
    : allItems;

  return <StatsBar items={items} />;
}
