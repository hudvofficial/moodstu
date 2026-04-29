import { getBudgetsWithActuals } from "@/app/actions/goal-budget-actions";
import { BudgetClient } from "@/components/finance/budget/budget-client";
import type { ActionResult, BudgetActualItem } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Ngân sách" };
export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const data = await getBudgetsWithActuals(month, year);

  return (
    <BudgetClient
      initialMonth={month}
      initialYear={year}
      initialData={unwrap<BudgetActualItem[]>(data, [])}
    />
  );
}

