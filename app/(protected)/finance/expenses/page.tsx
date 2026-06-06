import {
  fetchExpenses,
  fetchExpenseStats,
  fetchFinanceCategories,
} from "@/app/actions/finance-operations-queries";
import { ExpensesClient } from "@/components/finance/expenses/expenses-client";
import type { ActionResult } from "@/types/action-result";
import type { ExpensePage, FinanceCategory } from "@/types/finance-operations";

export const metadata = { title: "Phiếu chi" };
export const dynamic = "force-dynamic";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export default async function ExpensesPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [expensesResult, statsResult, categoriesResult] = await Promise.all([
    fetchExpenses({ page: 1, pageSize: 12, month, year }),
    fetchExpenseStats(month, year),
    fetchFinanceCategories("chi"),
  ]);

  return (
    <ExpensesClient
      initialMonth={month}
      initialYear={year}
      initialData={unwrap<ExpensePage>(expensesResult, { items: [], total: 0, page: 1, pageSize: 12 })}
      initialStats={unwrap(statsResult, undefined)}
      categories={unwrap<FinanceCategory[]>(categoriesResult, [])}
    />
  );
}

