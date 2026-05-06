"use client";

/**
 * 📊 InventoryStatsBar — Inventory stats (uses shared StatsBar)
 * Clone: contracts/compact-stats.tsx
 */

import { Package, AlertTriangle, DollarSign, ArrowLeftRight } from "lucide-react";
import type { InventoryStats } from "@/types/inventory";
import { formatVnd } from "@/lib/utils";
import { StatsBar } from "@/components/ui/stats-bar";

interface InventoryStatsBarProps {
  stats: InventoryStats | null;
}

export function InventoryStatsBar({ stats }: InventoryStatsBarProps) {
  const s = stats || {
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
    transactionsThisMonth: 0,
  };

  const items = [
    {
      icon: Package,
      label: "tổng vật tư",
      value: String(s.total),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: AlertTriangle,
      label: "sắp hết",
      value: String(s.lowStock),
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      icon: DollarSign,
      label: "tổng giá trị",
      value: formatVnd(s.totalValue),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: ArrowLeftRight,
      label: "giao dịch tháng",
      value: String(s.transactionsThisMonth),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  return <StatsBar items={items} />;
}
