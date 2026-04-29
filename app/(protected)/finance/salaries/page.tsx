import { fetchSalaries } from "@/app/actions/finance-operations-queries";
import { SalariesClient } from "@/components/finance/salaries/salaries-client";
import type { ActionResult, SalaryPageData } from "@/types/finance-operations";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

const emptySalaryData: SalaryPageData = {
  items: [],
  summary: {
    total_employees: 0,
    total_salary: 0,
    base_salary_total: 0,
    product_salary_total: 0,
    bonus_total: 0,
    penalty_total: 0,
    advance_total: 0,
  },
};

export const metadata = { title: "Bảng lương" };
export const dynamic = "force-dynamic";

export default async function SalariesPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const data = await fetchSalaries(month, year);

  return (
    <SalariesClient
      initialMonth={month}
      initialYear={year}
      initialData={unwrap<SalaryPageData>(data, emptySalaryData)}
    />
  );
}

