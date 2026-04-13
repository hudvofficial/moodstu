import { ArrowDown, ArrowUp, AlertTriangle, Wallet } from "lucide-react";
import type { DashboardMetrics } from "@/types/finance-dashboard";
import { StatsBar } from "@/components/ui/stats-bar";

function formatCompactVnd(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1_000_000_000) + " tỷ đ";
  }
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1_000_000) + "M đ";
  }
  if (Math.abs(amount) >= 1_000) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1_000) + "k đ";
  }
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

interface FinanceCompactBarProps {
  data: DashboardMetrics;
}

export function FinanceCompactBar({ data }: FinanceCompactBarProps) {
  const metrics = [
    {
      label: "Tổng Thu",
      value: formatCompactVnd(data.totalInflow),
      icon: ArrowDown,
      iconColor: "text-success",
      iconBg: "bg-success/10",
    },
    {
      label: "Tổng Chi",
      value: formatCompactVnd(data.totalOutflow),
      icon: ArrowUp,
      iconColor: "text-error",
      iconBg: "bg-error/10",
    },
    {
      label: "Tồn Quỹ",
      value: formatCompactVnd(data.profit),
      icon: Wallet,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      label: "Công Nợ",
      value: formatCompactVnd(data.totalDebt),
      icon: AlertTriangle,
      iconColor: "text-info",
      iconBg: "bg-info/10",
    },
  ];

  return <StatsBar items={metrics} />;
}
