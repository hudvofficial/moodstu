import { fetchPayables } from "@/app/actions/payable-actions";
import { PayablesClient } from "@/components/finance/payables/payables-client";
import type { ActionResult } from "@/types/action-result";
import type { PayableRow } from "@/types/payables";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Công nợ phải trả" };
export const dynamic = "force-dynamic";

// ADR-016 M2: một màn "Phải trả" cho lab ảnh · thợ ngoài · NCC phôi (thay /finance/lab-debts + /finance/vendor-debts)
export default async function PayablesPage() {
  const data = await fetchPayables();
  return <PayablesClient initialData={unwrap<PayableRow[]>(data, [])} />;
}
