"use client";

/**
 * 📊 ReceiptStatsBar — Receipt stats (uses shared StatsBar)
 * Clone pattern: inventory/inventory-stats-bar.tsx
 */

import { ReceiptText, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/utils";
import { StatsBar } from "@/components/ui/stats-bar";
import type { ReceiptStats } from "@/app/actions/finance-operations-queries";

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return (
      new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
        amount / 1_000_000,
      ) + "M " + CURRENCY_SYMBOL
    );
  }
  return new Intl.NumberFormat("vi-VN").format(amount) + " " + CURRENCY_SYMBOL;
}

interface ReceiptStatsBarProps {
  stats: ReceiptStats | null;
}

export function ReceiptStatsBar({ stats }: ReceiptStatsBarProps) {
  const s = stats || { totalReceipts: 0, totalAmount: 0, completedCount: 0, pendingCount: 0 };

  const items = [
    {
      icon: ReceiptText,
      label: "phiếu thu",
      value: String(s.totalReceipts),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: DollarSign,
      label: "tổng thu",
      value: formatCompact(s.totalAmount),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: CheckCircle2,
      label: "hoàn thành",
      value: String(s.completedCount),
      iconBg: "bg-info/10",
      iconColor: "text-info",
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
