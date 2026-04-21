"use client";

import { User, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { StatsBar } from "@/components/ui/stats-bar";
import type { SalarySummary } from "@/types/finance-operations";

interface SalaryStatsBarProps {
    summary: SalarySummary;
}

export function SalaryStatsBar({ summary }: SalaryStatsBarProps) {
    const items = [
        {
            icon: User,
            label: "tổng nhân sự",
            value: summary.total_employees.toString(),
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
        },
        {
            icon: Wallet,
            label: "tổng quỹ lương",
            value: formatVnd(summary.total_salary),
            iconBg: "bg-interactive/10",
            iconColor: "text-interactive",
        },
        {
            icon: ArrowUpRight,
            label: "tổng thưởng",
            value: formatVnd(summary.bonus_total),
            iconBg: "bg-success/10",
            iconColor: "text-success",
        },
        {
            icon: ArrowDownRight,
            label: "tổng phạt",
            value: formatVnd(summary.penalty_total),
            iconBg: "bg-error/10",
            iconColor: "text-error",
        },
    ];

    return <StatsBar items={items} />;
}
