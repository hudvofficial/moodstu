import { ExpensesClient } from "@/components/finance/expenses/expenses-client";

import { fetchExpenseStats } from "@/app/actions/finance-operations-queries";

export const metadata = { title: "Phiếu chi" };

export default async function ExpensesPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const statsRes = await fetchExpenseStats(month, year);
  const initialStats = statsRes.success ? statsRes.data : undefined;

  return <ExpensesClient initialMonth={month} initialYear={year} initialStats={initialStats} />;
}

