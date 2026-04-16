"use client";

import { useState } from "react";
import { ChevronDown, Wallet, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import type { DebtStats } from "@/app/actions/finance-operations-queries";

interface Props {
    stats: DebtStats;
}

export function DebtStatsMobile({ stats }: Props) {
    const [showAging, setShowAging] = useState(false);

    const metrics = [
        { label: "Phải thu", value: stats.receivable, color: "text-success", icon: TrendingUp },
        { label: "Phải trả", value: stats.payable, color: "text-error", icon: TrendingDown },
        { label: "Nợ ròng", value: stats.net_debt, color: "text-primary", icon: Wallet },
        { label: "Quá hạn", value: stats.overdue, color: "text-warning", icon: AlertTriangle },
    ];

    const agingTotal = Object.values(stats.aging).reduce((a, b) => a + b, 0);
    const getWidth = (val: number) => agingTotal === 0 ? 0 : (val / agingTotal) * 100;

    return (
        <div className="flex lg:hidden flex-col gap-3 mb-4">
            {/* Metrics Carousel */}
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 snap-x hide-scrollbar">
                {metrics.map(m => (
                    <div key={m.label} className="bg-bg-surface border border-border/50 rounded-xl p-3 min-w-[140px] flex-shrink-0 snap-start shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                            <m.icon className={`w-4 h-4 ${m.color}`} />
                            <span className="text-caption text-text-muted font-medium uppercase tracking-wider">{m.label}</span>
                        </div>
                        <div className={`text-body font-bold tabular-nums`}>{formatVnd(m.value)}</div>
                    </div>
                ))}
            </div>

            {/* Aging Accordion */}
            <div className="bg-bg-surface border border-border/50 rounded-xl p-3 shadow-sm">
                <button onClick={() => setShowAging(!showAging)} className="w-full flex items-center justify-between outline-none">
                    <div className="text-body-sm font-medium text-text-primary">Báo cáo tuổi nợ</div>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-300 ${showAging ? "rotate-180" : ""}`} />
                </button>

                <div className="h-2 w-full flex rounded-full overflow-hidden mt-3 bg-bg-hover">
                    {stats.aging.not_due > 0 && <div style={{ width: `${getWidth(stats.aging.not_due)}%` }} className="bg-success transition-all duration-500" />}
                    {stats.aging.days_1_30 > 0 && <div style={{ width: `${getWidth(stats.aging.days_1_30)}%` }} className="bg-[#fbbf24] transition-all duration-500" />}
                    {stats.aging.days_31_60 > 0 && <div style={{ width: `${getWidth(stats.aging.days_31_60)}%` }} className="bg-[#f59e0b] transition-all duration-500" />}
                    {stats.aging.days_61_90 > 0 && <div style={{ width: `${getWidth(stats.aging.days_61_90)}%` }} className="bg-[#ea580c] transition-all duration-500" />}
                    {stats.aging.over_90 > 0 && <div style={{ width: `${getWidth(stats.aging.over_90)}%` }} className="bg-error transition-all duration-500" />}
                </div>

                <div className={`grid grid-cols-2 gap-y-3 gap-x-2 transition-all duration-300 overflow-hidden ${showAging ? "mt-4 pt-4 border-t border-border/30 max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                    <LegendItemMobile label="Chưa đến hạn" value={stats.aging.not_due} color="bg-success" />
                    <LegendItemMobile label="1-30 ngày" value={stats.aging.days_1_30} color="bg-[#fbbf24]" />
                    <LegendItemMobile label="31-60 ngày" value={stats.aging.days_31_60} color="bg-[#f59e0b]" />
                    <LegendItemMobile label="61-90 ngày" value={stats.aging.days_61_90} color="bg-[#ea580c]" />
                    <LegendItemMobile label="> 90 ngày" value={stats.aging.over_90} color="bg-error" />
                </div>
            </div>
        </div>
    );
}

function LegendItemMobile({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${color} shadow-sm`} />
                <span className="text-[11px] text-text-muted">{label}</span>
            </div>
            <div className="text-caption font-medium tabular-nums pl-3.5">{formatVnd(value)}</div>
        </div>
    );
}
