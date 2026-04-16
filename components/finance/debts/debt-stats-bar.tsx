"use client";

import type { DebtStats } from "@/app/actions/finance-operations-queries";
import { DebtStatsDesktop } from "./debt-stats-desktop";
import { DebtStatsMobile } from "./debt-stats-mobile";

interface DebtStatsBarProps {
    stats: DebtStats;
}

export function DebtStatsBar({ stats }: DebtStatsBarProps) {
    if (!stats || !stats.aging) return null; // Safe guard
    return (
        <>
            <DebtStatsDesktop stats={stats} />
            <DebtStatsMobile stats={stats} />
        </>
    );
}
