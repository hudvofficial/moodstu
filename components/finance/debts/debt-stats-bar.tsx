"use client";

import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { StatsBar } from "@/components/ui/stats-bar";
import { formatVnd } from "@/components/finance/finance-format";
import type { DebtStats } from "@/app/actions/finance-operations-queries";

interface Props {
  stats: DebtStats;
}

export function DebtStatsBar({ stats }: Props) {
  if (!stats) return null;

  const items = [
    { icon: TrendingUp, label: "Phải thu", value: formatVnd(stats.receivable), iconBg: "bg-success/10", iconColor: "text-success" },
    { icon: TrendingDown, label: "Phải trả", value: formatVnd(stats.payable), iconBg: "bg-error/10", iconColor: "text-error" },
    { icon: Wallet, label: "Nợ ròng", value: formatVnd(stats.net_debt), iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: AlertTriangle, label: "Quá hạn", value: formatVnd(stats.overdue), iconBg: "bg-warning/10", iconColor: "text-warning" },
  ];

  return <StatsBar items={items} />;
}
