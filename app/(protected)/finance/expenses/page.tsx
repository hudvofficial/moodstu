import { ExpensesClient } from "@/components/finance/expenses/expenses-client";

export const metadata = { title: "Phieu chi | Mood Studio" };

export default function ExpensesPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return <ExpensesClient initialMonth={month} initialYear={year} />;
}
