"use client";

import { Users, DollarSign, Briefcase } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { StatsBar } from "@/components/ui/stats-bar";
import type { VendorCostSummary } from "@/types/finance-operations";

interface VendorCostsStatsBarProps {
  summary: VendorCostSummary;
}

export function VendorCostsStatsBar({ summary }: VendorCostsStatsBarProps) {
  const items = [
    {
      icon: Users,
      label: "Thợ cộng tác",
      value: summary.vendor_count.toString(),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: DollarSign,
      label: "Tổng chi phí",
      value: formatVnd(summary.total_cost),
      iconBg: "bg-error/10",
      iconColor: "text-error",
    },
    {
      icon: Briefcase,
      label: "Tổng số jobs",
      value: summary.total_jobs.toString(),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
  ];

  return <StatsBar items={items} />;
}
