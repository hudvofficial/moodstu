import { fetchIntegrityReports } from "@/app/actions/integrity-actions";
import { fetchDebts } from "@/app/actions/finance-operations-queries";
import { DebtsClient } from "@/components/finance/debts/debts-client";
import type { ActionResult, DebtListItem, IntegrityReportItem } from "@/types/finance-operations";
import type { PaginatedResult } from "@/types/finance-dashboard";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Công nợ | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const [debts, integrity] = await Promise.all([fetchDebts(), fetchIntegrityReports()]);
  const debtData = unwrap<PaginatedResult<DebtListItem>>(debts, { items: [], total: 0, page: 1, pageSize: 20 });

  return (
    <DebtsClient
      initialData={debtData.items}
      initialIntegrity={unwrap<IntegrityReportItem[]>(integrity, [])}
    />
  );
}
