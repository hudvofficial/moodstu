"use client";

/**
 * 📊 ExpenseStatsBar — Expense stats (uses shared StatsBar)
 * Clone pattern: finance/receipts/receipt-stats-bar.tsx
 */

import { ReceiptText, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { formatVnd } from "@/lib/utils";
import { StatsBar } from "@/components/ui/stats-bar";
import type { ExpenseStats } from "@/app/actions/finance-operations-queries";

interface ExpenseStatsBarProps {
  stats: ExpenseStats | null;
}

export function ExpenseStatsBar({ stats }: ExpenseStatsBarProps) {
  const s = stats || { totalExpenses: 0, totalAmount: 0, approvedCount: 0, pendingCount: 0 };

  const items = [
    {
      icon: ReceiptText,
      label: "phiếu chi",
      value: String(s.totalExpenses),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
    {
      icon: DollarSign,
      label: "tổng chi",
      value: formatVnd(s.totalAmount),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: CheckCircle2,
      label: "đã duyệt",
      value: String(s.approvedCount),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: Clock,
      label: "chờ duyệt",
      value: String(s.pendingCount),
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
  ];

  return <StatsBar items={items} />;
}
