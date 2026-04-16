"use client";

import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import type { DebtStats } from "@/app/actions/finance-operations-queries";

interface Props {
    stats: DebtStats;
}

export function DebtStatsDesktop({ stats }: Props) {
    // Metric Items
    const metrics = [
        { label: "Phải thu", value: stats.receivable, color: "text-success", bg: "bg-success/10", icon: TrendingUp },
        { label: "Phải trả", value: stats.payable, color: "text-error", bg: "bg-error/10", icon: TrendingDown },
        { label: "Nợ ròng", value: stats.net_debt, color: "text-primary", bg: "bg-primary/10", icon: Wallet },
        { label: "Quá hạn", value: stats.overdue, color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
    ];

    const agingTotal = Object.values(stats.aging).reduce((a, b) => a + b, 0);
    const getWidth = (val: number) => agingTotal === 0 ? 0 : (val / agingTotal) * 100;

    return (
        <div className="hidden lg:flex flex-col gap-4 mb-6">
            {/* 4 Metrics Row */}
            <div className="grid grid-cols-4 gap-4">
                {metrics.map(m => (
                    <div key={m.label} className="bg-bg-surface border border-border/50 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`p-3 rounded-xl ${m.bg} ${m.color}`}>
                            <m.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-caption text-text-muted font-medium uppercase tracking-wider">{m.label}</div>
                            <div className="text-h2 font-bold tabular-nums mt-0.5">{formatVnd(m.value)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Aging Report Row */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 bg-bg-surface border border-border/50 rounded-xl p-5 shadow-sm group">
                    <h3 className="text-body-sm font-semibold mb-4 text-text-primary">Phân tích tuổi nợ (Aging)</h3>

                    {/* Horizontal Bar */}
                    <div className="h-4 w-full flex rounded-full overflow-hidden mb-4 bg-bg-hover">
                        {stats.aging.not_due > 0 && <div style={{ width: `${getWidth(stats.aging.not_due)}%` }} className="bg-success transition-all duration-500" title="Chưa đến hạn" />}
                        {stats.aging.days_1_30 > 0 && <div style={{ width: `${getWidth(stats.aging.days_1_30)}%` }} className="bg-[#fbbf24] transition-all duration-500" title="1 - 30 ngày" />}
                        {stats.aging.days_31_60 > 0 && <div style={{ width: `${getWidth(stats.aging.days_31_60)}%` }} className="bg-[#f59e0b] transition-all duration-500" title="31 - 60 ngày" />}
                        {stats.aging.days_61_90 > 0 && <div style={{ width: `${getWidth(stats.aging.days_61_90)}%` }} className="bg-[#ea580c] transition-all duration-500" title="61 - 90 ngày" />}
                        {stats.aging.over_90 > 0 && <div style={{ width: `${getWidth(stats.aging.over_90)}%` }} className="bg-error transition-all duration-500" title="> 90 ngày" />}
                    </div>

                    {/* Legend Table */}
                    <div className="grid grid-cols-5 gap-2 mt-2">
                        <LegendItem label="Chưa đến hạn" value={stats.aging.not_due} color="bg-success" />
                        <LegendItem label="1-30 ngày" value={stats.aging.days_1_30} color="bg-[#fbbf24]" />
                        <LegendItem label="31-60 ngày" value={stats.aging.days_31_60} color="bg-[#f59e0b]" />
                        <LegendItem label="61-90 ngày" value={stats.aging.days_61_90} color="bg-[#ea580c]" />
                        <LegendItem label="> 90 ngày" value={stats.aging.over_90} color="bg-error" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function LegendItem({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`} />
                <span className="text-caption text-text-muted truncate">{label}</span>
            </div>
            <div className="text-body-sm font-medium tabular-nums pl-4">{formatVnd(value)}</div>
        </div>
    );
}
