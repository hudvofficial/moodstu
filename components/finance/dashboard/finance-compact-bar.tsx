import { ArrowDown, ArrowUp, AlertTriangle, Wallet } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import type { DashboardMetrics } from "@/types/finance-dashboard";
import { StatsBar } from "@/components/ui/stats-bar";

interface FinanceCompactBarProps {
  data: DashboardMetrics;
}

export function FinanceCompactBar({ data }: FinanceCompactBarProps) {
  const metrics = [
    {
      label: "Tổng Thu",
      value: formatVnd(data.totalInflow),
      icon: ArrowDown,
      iconColor: "text-success",
      iconBg: "bg-success/10",
    },
    {
      label: "Tổng Chi",
      value: formatVnd(data.totalOutflow),
      icon: ArrowUp,
      iconColor: "text-error",
      iconBg: "bg-error/10",
    },
    {
      label: "Tồn Quỹ",
      value: formatVnd(data.profit),
      icon: Wallet,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      label: "Công Nợ",
      value: formatVnd(data.totalDebt),
      icon: AlertTriangle,
      iconColor: "text-info",
      iconBg: "bg-info/10",
    },
  ];

  return <StatsBar items={metrics} />;
}
