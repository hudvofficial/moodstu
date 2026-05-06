"use client";

/**
 * 📊 ContractsStats — KPI cards for contracts list
 *
 * Desktop: 4-col grid (KPICard)
 * Mobile: Horizontal scroll cards
 *
 * V1 Logic: total, active, pending, completed + growth %
 * V2 Style: Earth-tone KPICard, Lucide icons
 */

import { FileText, DollarSign, Loader, CheckCircle } from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { formatVnd } from "@/lib/utils";
import type { ContractStats } from "@/types/contract";

interface ContractsStatsProps {
  stats: ContractStats;
}

export function ContractsStats({ stats }: ContractsStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Tổng hợp đồng"
        value={String(stats.total)}
        icon={FileText}
        iconBg="bg-primary/10"
        iconColor="text-primary"
        trend={`${stats.growth.total > 0 ? "+" : ""}${stats.growth.total}%`}
        trendUp={stats.growth.total >= 0}
        className="entrance entrance-1"
      />
      <KPICard
        label="Đang thực hiện"
        value={String(stats.active)}
        icon={Loader}
        iconBg="bg-info/10"
        iconColor="text-info"
        trend={`${stats.growth.active > 0 ? "+" : ""}${stats.growth.active}%`}
        trendUp={stats.growth.active >= 0}
        className="entrance entrance-2"
      />
      <KPICard
        label="Doanh thu"
        value={formatVnd(stats.revenue)}
        icon={DollarSign}
        iconBg="bg-warning/10"
        iconColor="text-warning"
        className="entrance entrance-3"
      />
      <KPICard
        label="Hoàn thành"
        value={String(stats.completed)}
        icon={CheckCircle}
        iconBg="bg-success/10"
        iconColor="text-success"
        trend={`${stats.growth.completed > 0 ? "+" : ""}${stats.growth.completed}%`}
        trendUp={stats.growth.completed >= 0}
        className="entrance entrance-4"
      />
    </div>
  );
}
