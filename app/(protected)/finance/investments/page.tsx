import { fetchInvestments } from "@/app/actions/finance-operations-queries";
import { InvestmentsClient } from "@/components/finance/investments/investments-client";
import type { ActionResult, InvestmentItem } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Tài sản đầu tư" };
export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const data = await fetchInvestments();
  return <InvestmentsClient initialData={unwrap<InvestmentItem[]>(data, [])} />;
}

