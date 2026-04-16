import { fetchDebts, fetchDebtStats } from "@/app/actions/finance-operations-queries";
import { fetchIntegrityReports } from "@/app/actions/integrity-actions";
import { getStudioInfo } from "@/app/actions/settings-queries";
import { DebtsClient } from "@/components/finance/debts/debts-client";
import type { ActionResult, DebtListItem, IntegrityReportItem } from "@/types/finance-operations";
import type { PaginatedResult } from "@/types/finance-dashboard";
import type { DebtStats } from "@/app/actions/finance-operations-queries";
import type { Metadata } from "next";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata: Metadata = {
  title: "Quản lý công nợ",
  description: "Quản lý khoản phải thu và khoản phải trả.",
};
export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const [debts, stats, integrity, studioInfo] = await Promise.all([
    fetchDebts(),
    fetchDebtStats(),
    fetchIntegrityReports(),
    getStudioInfo()
  ]);

  const debtData = unwrap<PaginatedResult<DebtListItem>>(debts, { items: [], total: 0, page: 1, pageSize: 20 });
  const debtStats = unwrap<DebtStats>(stats, {
    receivable: 0,
    payable: 0,
    net_debt: 0,
    overdue: 0,
    aging: { not_due: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 }
  });

  return (
    <DebtsClient
      initialData={debtData}
      initialStats={debtStats}
      initialIntegrity={unwrap<IntegrityReportItem[]>(integrity, [])}
      bankInfo={unwrap(studioInfo, null)?.bank_info || null}
    />
  );
}
