import { fetchFixedCosts } from "@/app/actions/finance-operations-queries";
import { FixedCostsClient } from "@/components/finance/fixed-costs/fixed-costs-client";
import type { ActionResult, FixedCostItem } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Chi phí cố định | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function FixedCostsPage() {
  const data = await fetchFixedCosts();
  return <FixedCostsClient initialData={unwrap<FixedCostItem[]>(data, [])} />;
}
