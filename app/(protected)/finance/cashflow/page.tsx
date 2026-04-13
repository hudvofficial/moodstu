import { fetchLedger } from "@/app/actions/finance-dashboard-queries";
import { LedgerClient } from "@/components/finance/cashflow/ledger-client";
import type { LedgerItem, PaginatedResult } from "@/types/finance-dashboard";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Sổ cái thu chi | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function CashflowPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const initial = await fetchLedger({ page: 1, pageSize: 12, month, year, type: "all" });

  return (
    <LedgerClient
      initialMonth={month}
      initialYear={year}
      initialLedger={unwrap<PaginatedResult<LedgerItem>>(initial, {
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
      })}
    />
  );
}
