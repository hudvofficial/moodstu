"use client";

import { PendingCollections } from "@/components/finance/dashboard/pending-collections";
import { DebtAgingCard } from "@/components/finance/debts/debt-aging-card";
import type { DebtStats } from "@/app/actions/finance-operations-queries";
import type { FinanceContractListItem } from "@/types/finance-dashboard";

interface ReportsDebtsViewProps {
  debtStats: DebtStats;
  pending: FinanceContractListItem[];
}

export function ReportsDebtsView({ debtStats, pending }: ReportsDebtsViewProps) {
  return (
    <div className="space-y-4">
      <div className="card-base px-4 py-3">
        <p className="text-caption text-text-muted">
          Công nợ hiện tại, không lọc theo kỳ báo cáo.
        </p>
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DebtAgingCard stats={debtStats} />
        </div>
        <div className="lg:col-span-2">
          <PendingCollections data={pending} />
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        <DebtAgingCard stats={debtStats} />
        <PendingCollections data={pending} />
      </div>
    </div>
  );
}
