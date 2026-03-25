"use client";

/**
 * 📊 CompactStats — Contract stats (uses shared StatsBar)
 * Phase 5: refactored to shared StatsBar component
 * Keeps: formatCompact(), items logic
 */

import { FileText, Zap, DollarSign, CheckCircle } from "lucide-react";
import type { ContractStats } from "@/types/contract";
import { CURRENCY_SYMBOL } from "@/lib/utils";
import { StatsBar } from "@/components/ui/stats-bar";

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return (
      new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
        amount / 1_000_000
      ) + "M " + CURRENCY_SYMBOL
    );
  }
  return new Intl.NumberFormat("vi-VN").format(amount) + " " + CURRENCY_SYMBOL;
}

interface CompactStatsProps {
  stats: ContractStats;
}

export function CompactStats({ stats }: CompactStatsProps) {
  const items = [
    {
      icon: FileText,
      label: "tổng",
      value: String(stats.total),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: Zap,
      label: "đang thực hiện",
      value: String(stats.active),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
    {
      icon: DollarSign,
      label: "doanh thu",
      value: formatCompact(stats.revenue),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: CheckCircle,
      label: "hoàn thành",
      value: String(stats.completed),
      iconBg: "bg-success/10",
      iconColor: "text-success",
      trend: stats.growth.completed,
    },
  ];

  return <StatsBar items={items} />;
}
