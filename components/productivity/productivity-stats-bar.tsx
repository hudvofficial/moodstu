"use client";

import { AlertTriangle, CircleCheckBig, Clock3, ListTodo } from "lucide-react";
import { StatsBar } from "@/components/ui/stats-bar";
import { formatHours } from "@/components/productivity/utils";
import type { ProductivitySummary, ProductivityViewMode } from "@/types/productivity";

interface ProductivityStatsBarProps {
  summary: ProductivitySummary;
  viewMode: ProductivityViewMode;
}

export function ProductivityStatsBar({
  summary,
  viewMode,
}: ProductivityStatsBarProps) {
  const finalLabel =
    viewMode === "team" ? "Nhân sự quá tải" : "Task quá hạn";
  const finalValue =
    viewMode === "team"
      ? `${summary.overloaded_count}`
      : `${summary.total_overdue_tasks}`;

  return (
    <StatsBar
      items={[
        {
          icon: Clock3,
          label: "Giờ on-set",
          value: formatHours(summary.total_onsite_hours),
        },
        {
          icon: ListTodo,
          label: "Task đang xử lý",
          value: `${summary.total_active_tasks}`,
          iconBg: "bg-warning/10",
          iconColor: "text-warning",
        },
        {
          icon: CircleCheckBig,
          label: "Tỷ lệ hoàn thành",
          value: `${summary.completion_rate}%`,
          iconBg: "bg-success/10",
          iconColor: "text-success",
        },
        {
          icon: AlertTriangle,
          label: finalLabel,
          value: finalValue,
          iconBg: "bg-error/10",
          iconColor: "text-error",
        },
      ]}
    />
  );
}
