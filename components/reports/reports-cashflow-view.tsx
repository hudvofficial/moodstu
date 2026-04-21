"use client";

import { RecentTransactions } from "@/components/finance/dashboard/recent-transactions";
import { ReportsCashflowChart } from "@/components/reports/reports-cashflow-chart";
import type { LedgerItem } from "@/types/finance-dashboard";
import type { CashflowTimelinePoint, ReportsSnapshot } from "@/types/reports";

interface ReportsCashflowViewProps {
  cashflow: CashflowTimelinePoint[];
  ledgerItems: LedgerItem[];
  snapshot: ReportsSnapshot;
}

export function ReportsCashflowView({
  cashflow,
  ledgerItems,
  snapshot,
}: ReportsCashflowViewProps) {
  const chart = (
    <ReportsCashflowChart
      data={cashflow}
      periodLabel={snapshot.range.label}
      periodType={snapshot.range.periodType}
      summary={snapshot.cashflowSummary}
    />
  );

  const transactions = <RecentTransactions data={ledgerItems} />;

  return (
    <>
      <div className="hidden lg:grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">{chart}</div>
        <div className="lg:col-span-2">{transactions}</div>
      </div>

      <div className="space-y-4 lg:hidden">
        {chart}
        {transactions}
      </div>
    </>
  );
}
