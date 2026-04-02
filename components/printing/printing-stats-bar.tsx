"use client";

import {
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Printer,
  ScanLine,
  Truck,
} from "lucide-react";
import { StatsBar } from "@/components/ui/stats-bar";
import type { PrintingStats } from "@/types/printing";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

interface Props {
  stats: PrintingStats;
}

export default function PrintingStatsBar({ stats }: Props) {
  return (
    <StatsBar
      items={[
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
      ]}
    />
  );
}

