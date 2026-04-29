import { notFound } from "next/navigation";
import { getExpenseDetail } from "@/app/actions/finance-operations-queries";
import { getStudioInfo } from "@/app/actions/settings-queries";
import { PrintExpenseClient } from "@/components/finance/expenses/print-expense-client";
import type { ExpensePrintData } from "@/components/finance/expenses/print-expense-client";

export const metadata = { title: "In phiếu chi" };

export const dynamic = "force-dynamic";

export default async function PrintExpensePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  const [expenseResult, studioResult] = await Promise.all([
    getExpenseDetail(params.id),
    getStudioInfo(),
  ]);

  if (!expenseResult.success || !expenseResult.data) notFound();

  return (
    <PrintExpenseClient
      expense={expenseResult.data as ExpensePrintData}
      studioInfo={studioResult.success ? studioResult.data : null}
    />
  );
}

