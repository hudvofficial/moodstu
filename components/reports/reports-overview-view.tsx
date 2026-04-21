"use client";

import { ServiceDonutChart } from "@/components/finance/dashboard/service-donut-chart";
import { ReportsOverviewPanels } from "@/components/reports/reports-overview-panels";
import type { ReportsSnapshot } from "@/types/reports";

interface ReportsOverviewViewProps {
  snapshot: ReportsSnapshot;
}

export function ReportsOverviewView({ snapshot }: ReportsOverviewViewProps) {
  const donut = (
    <ServiceDonutChart
      data={snapshot.serviceDistribution}
      title="Phân bổ dịch vụ"
      emptyText="Chưa có hợp đồng thuộc kỳ đang xem."
    />
  );

  const panels = (
    <ReportsOverviewPanels
      revenueBreakdown={snapshot.revenueBreakdown}
      summary={snapshot.summary}
    />
  );

  return (
    <>
      <div className="hidden gap-4 lg:grid lg:grid-cols-5">
        <div className="lg:col-span-2">{donut}</div>
        <div className="lg:col-span-3">{panels}</div>
      </div>

      <div className="space-y-4 lg:hidden">
        {panels}
        {donut}
      </div>
    </>
  );
}
