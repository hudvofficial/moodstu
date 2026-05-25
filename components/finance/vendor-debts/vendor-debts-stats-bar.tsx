"use client";

import { Users, DollarSign, AlertTriangle, Calendar } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { StatsBar } from "@/components/ui/stats-bar";
import type { VendorDebtItem } from "@/types/vendor";

interface VendorDebtsStatsBarProps {
  debts: VendorDebtItem[];
}

export function VendorDebtsStatsBar({ debts }: VendorDebtsStatsBarProps) {
  const totalVendors = debts.length;
  const totalDebt = debts.reduce((sum, d) => sum + d.remaining, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.total_paid, 0);

  // Count vendors with overdue unpaid tasks (latest task deadline < today)
  const today = new Date().toISOString().split("T")[0];
  const vendorsWithOverdueTasks = debts.filter((d) => d.last_task_date && d.last_task_date < today).length;

  const items = [
    {
      icon: Users,
      label: "Vendors có nợ",
      value: totalVendors.toString(),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: DollarSign,
      label: "Tổng công nợ",
      value: formatVnd(totalDebt),
      iconBg: "bg-error/10",
      iconColor: "text-error",
    },
    {
      icon: Calendar,
      label: "Tổng đã thanh toán",
      value: formatVnd(totalPaid),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: AlertTriangle,
      label: "Vendors quá hạn",
      value: vendorsWithOverdueTasks.toString(),
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
  ];

  return <StatsBar items={items} />;
}
