import { fetchExpenses, fetchFinanceCategories } from "@/app/actions/finance-operations-queries";
import { ExpensesClient } from "@/components/finance/expenses/expenses-client";
import type { ActionResult, ExpensePage, FinanceCategory } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Phiếu chi | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [expenses, categories] = await Promise.all([
    fetchExpenses({ page: 1, pageSize: 12, month, year, approval: "all" }),
    fetchFinanceCategories("Chi"),
  ]);

  return (
    <ExpensesClient
      initialMonth={month}
      initialYear={year}
      initialData={unwrap<ExpensePage>(expenses, { items: [], total: 0, page: 1, pageSize: 12 })}
      categories={unwrap<FinanceCategory[]>(categories, [])}
    />
  );
}
