import { fetchGoals } from "@/app/actions/finance-operations-queries";
import { GoalsClient } from "@/components/finance/goals/goals-client";
import type { ActionResult, GoalItem } from "@/types/finance-operations";
import type { PaginatedResult } from "@/types/finance-dashboard";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Mục tiêu tài chính | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const data = await fetchGoals();
  const goalData = unwrap<PaginatedResult<GoalItem>>(data, { items: [], total: 0, page: 1, pageSize: 20 });
  return <GoalsClient initialData={goalData.items} />;
}
