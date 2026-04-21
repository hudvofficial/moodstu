"use client";

/**
 * 📊 GoalsStatsBar — Goals summary (uses shared StatsBar)
 * Pattern: finance/receipts/receipt-stats-bar.tsx
 */

import { CheckCircle2, Coins, Flag, Wallet } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/utils";
import { StatsBar } from "@/components/ui/stats-bar";
import type { GoalItem } from "@/types/finance-operations";

function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1_000_000_000) + "B " + CURRENCY_SYMBOL;
  }
  if (abs >= 1_000_000) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1_000_000) + "M " + CURRENCY_SYMBOL;
  }
  if (abs >= 1_000) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1_000) + "K " + CURRENCY_SYMBOL;
  }
  return new Intl.NumberFormat("vi-VN").format(amount) + " " + CURRENCY_SYMBOL;
}

interface GoalsStatsBarProps {
  goals: GoalItem[];
}

export function GoalsStatsBar({ goals }: GoalsStatsBarProps) {
  const completedCount = goals.filter((goal) => (goal.status || "").toLowerCase() === "completed").length;
  const totalSaved = goals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
  const totalRemaining = goals.reduce((sum, goal) => sum + (goal.remaining || 0), 0);

  const items = [
    {
      icon: Flag,
      label: "mục tiêu",
      value: String(goals.length),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: Coins,
      label: "đã góp",
      value: formatCompact(totalSaved),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: Wallet,
      label: "còn lại",
      value: formatCompact(totalRemaining),
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      icon: CheckCircle2,
      label: "hoàn thành",
      value: String(completedCount),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  return <StatsBar items={items} />;
}

