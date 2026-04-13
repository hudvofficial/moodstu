import { fetchContractOptions, fetchFinanceCategories, fetchReceipts } from "@/app/actions/finance-operations-queries";
import { ReceiptsClient } from "@/components/finance/receipts/receipts-client";
import type { ActionResult, FinanceCategory, FinanceContractOption, ReceiptPage } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Phiếu thu | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [receipts, categories, contracts] = await Promise.all([
    fetchReceipts({ page: 1, pageSize: 12, month, year }),
    fetchFinanceCategories("Thu"),
    fetchContractOptions(),
  ]);

  return (
    <ReceiptsClient
      initialMonth={month}
      initialYear={year}
      initialData={unwrap<ReceiptPage>(receipts, { items: [], total: 0, page: 1, pageSize: 12 })}
      categories={unwrap<FinanceCategory[]>(categories, [])}
      contracts={unwrap<FinanceContractOption[]>(contracts, [])}
    />
  );
}
