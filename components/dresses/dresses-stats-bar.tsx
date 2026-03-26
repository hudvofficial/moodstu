"use client";

/**
 * 📊 DressesStatsBar — Dress stats (uses shared StatsBar)
 * Pattern: contracts/compact-stats.tsx (Gold Standard)
 */

import { Shirt, CheckCircle, CalendarClock, Package } from "lucide-react";
import type { DressStats } from "@/types/dress";
import { StatsBar } from "@/components/ui/stats-bar";

interface DressesStatsBarProps {
  stats: DressStats;
}

export function DressesStatsBar({ stats }: DressesStatsBarProps) {
  const items = [
    {
      icon: Package,
      label: "tổng",
      value: String(stats.total),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: CheckCircle,
      label: "sẵn sàng",
      value: String(stats.available),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: CalendarClock,
      label: "đã đặt",
      value: String(stats.reserved),
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      icon: Shirt,
      label: "đang thuê",
      value: String(stats.rented),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  return <StatsBar items={items} />;
}
