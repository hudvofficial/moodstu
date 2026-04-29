import { fetchLabDebts } from "@/app/actions/finance-operations-queries";
import { LabDebtsClient } from "@/components/finance/lab-debts/lab-debts-client";
import type { ActionResult, LabDebtItem } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Công nợ lab" };
export const dynamic = "force-dynamic";

export default async function LabDebtsPage() {
  const data = await fetchLabDebts();
  return <LabDebtsClient initialData={unwrap<LabDebtItem[]>(data, [])} />;
}

