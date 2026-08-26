"use client";

import { Banknote, FlaskConical, Package, Users } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { StatsBar } from "@/components/ui/stats-bar";
import type { PayableRow } from "@/types/payables";

interface PayablesStatsBarProps {
  rows: PayableRow[];
}

export function PayablesStatsBar({ rows }: PayablesStatsBarProps) {
  const sum = (type?: PayableRow["payee_type"]) =>
    rows.filter((r) => !type || r.payee_type === type).reduce((total, r) => total + r.remaining, 0);

  return (
    <StatsBar
      items={[
        { icon: Banknote, label: "Tổng phải trả", value: formatVnd(sum()), tone: "error" },
        { icon: FlaskConical, label: "Lab ảnh", value: formatVnd(sum("lab")), tone: "info" },
        { icon: Users, label: "Thợ ngoài", value: formatVnd(sum("vendor")), tone: "warning" },
        { icon: Package, label: "NCC phôi", value: formatVnd(sum("supplier")), tone: "primary" },
      ]}
    />
  );
}
