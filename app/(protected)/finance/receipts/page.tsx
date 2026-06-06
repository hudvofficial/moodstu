import {
  fetchReceipts,
  fetchReceiptStats,
  fetchFinanceCategories,
  fetchContractOptions,
} from "@/app/actions/finance-operations-queries";
import { ReceiptsClient } from "@/components/finance/receipts/receipts-client";
import type { ActionResult } from "@/types/action-result";
import type { ReceiptPage, FinanceCategory, FinanceContractOption } from "@/types/finance-operations";

export const metadata = { title: "Phiếu thu" };
export const dynamic = "force-dynamic";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export default async function ReceiptsPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Parallel SSR fetch — categories & contracts are small lookups, receipts is the main data
  const [receiptsResult, statsResult, categoriesResult, contractsResult] =
    await Promise.all([
      fetchReceipts({ page: 1, pageSize: 12, month, year }),
      fetchReceiptStats(month, year),
      fetchFinanceCategories("thu"),
      fetchContractOptions(),
    ]);

  return (
    <ReceiptsClient
      initialMonth={month}
      initialYear={year}
      initialData={unwrap<ReceiptPage>(receiptsResult, { items: [], total: 0, page: 1, pageSize: 12 })}
      initialStats={unwrap(statsResult, undefined)}
      categories={unwrap<FinanceCategory[]>(categoriesResult, [])}
      contracts={unwrap<FinanceContractOption[]>(contractsResult, [])}
    />
  );
}

