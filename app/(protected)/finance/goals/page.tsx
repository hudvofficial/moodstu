import { fetchGoals, fetchGoalsCashflow } from "@/app/actions/finance-operations-queries";
import { GoalsClient } from "@/components/finance/goals/goals-client";
import type { ActionResult, GoalItem } from "@/types/finance-operations";
import type { PaginatedResult } from "@/types/finance-dashboard";
import type { GoalsCashflowData } from "@/app/actions/finance-operations-queries";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Mục tiêu tài chính" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [goalsResult, cashflowResult] = await Promise.all([fetchGoals(), fetchGoalsCashflow()]);
  const goalData = unwrap<PaginatedResult<GoalItem>>(goalsResult, { items: [], total: 0, page: 1, pageSize: 20 });
  const cashflowData = unwrap<GoalsCashflowData | null>(cashflowResult, null);
  return <GoalsClient initialData={goalData.items} initialCashflow={cashflowData} />;
}

