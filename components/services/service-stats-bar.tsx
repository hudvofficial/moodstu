"use client";

import { Package, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import { formatVnd } from "@/lib/utils";
import type { ServiceStats } from "@/types/service";

interface Props {
  stats: ServiceStats;
}

export default function ServiceStatsBar({ stats }: Props) {
  const items: StatItem[] = [
    {
      icon: Package,
      label: "Dịch vụ",
      value: String(stats.total),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: TrendingUp,
      label: "Giá TB",
      value: formatVnd(stats.avgPrice),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: ArrowUp,
      label: "Cao nhất",
      value: formatVnd(stats.maxPrice),
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      icon: ArrowDown,
      label: "Thấp nhất",
      value: formatVnd(stats.minPrice),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  return <StatsBar items={items} />;
}
