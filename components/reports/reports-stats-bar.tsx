"use client";

import { CheckCircle2, Layers3, TrendingUp, Wallet } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { StatsBar } from "@/components/ui/stats-bar";
import type { ReportSummary } from "@/types/reports";

interface ReportsStatsBarProps {
  summary: ReportSummary;
}

export function ReportsStatsBar({ summary }: ReportsStatsBarProps) {
  return (
    <StatsBar
      items={[
        {
          icon: TrendingUp,
          label: "Doanh thu",
          value: formatVnd(summary.totalRevenue),
          tone: "success",
        },
        {
          icon: Layers3,
          label: "Tổng chi",
          value: formatVnd(summary.totalCost),
          tone: "error",
        },
        {
          icon: Wallet,
          label: "Lợi nhuận",
          value: formatVnd(summary.netProfit),
          tone: summary.netProfit >= 0 ? "primary" : "error",
        },
        {
          icon: CheckCircle2,
          label: "Hoàn thành",
          value: `${summary.completedContracts}/${summary.totalContracts}`,
          tone: "info",
        },
      ]}
    />
  );
}
