"use server";

import { withAuth } from "@/lib/auth_utils";
import { enumerateMonthsInRange } from "@/lib/report-period";

type Timeline = Record<string, { date: string; inflow: number; outflow: number }>;

function buildDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDate(date: string, startDate: string, endDate: string) {
  if (date < startDate) return startDate;
  if (date > endDate) return endDate;
  return date;
}

function addAmount(timeline: Timeline, date: string, type: "inflow" | "outflow", amount: number) {
  if (!amount) return;
  if (!timeline[date]) timeline[date] = { date, inflow: 0, outflow: 0 };
  timeline[date][type] += amount;
}

export async function getCashflowTimeline(startDate: string, endDate: string) {
  return withAuth(async (supabase) => {
    const monthSlices = enumerateMonthsInRange(startDate, endDate);
    const reportYears = Array.from(new Set(monthSlices.map((slice) => slice.year)));

    const [paymentsResult, receiptsResult, expensesResult, salariesResult, fixedCostsResult] = await Promise.all([
      supabase
        .from("payments")
        .select("payment_date, amount")
        .gte("payment_date", startDate)
        .lte("payment_date", endDate)
        .is("deleted_at", null),
      supabase
        .from("receipts")
        .select("receipt_date, receipt_amount")
        .is("contract_id", null)
        .is("deleted_at", null)
        .gte("receipt_date", startDate)
        .lte("receipt_date", endDate),
      supabase
        .from("expenses")
        .select("expense_date, amount")
        .is("deleted_at", null)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate),
      supabase
        .from("monthly_salaries")
        .select("month, year, total_salary")
        .in("year", reportYears),
      supabase
        .from("fixed_costs")
        .select("monthly_amount, start_date, end_date")
        .is("deleted_at", null),
    ]);

    const firstError =
      paymentsResult.error ||
      receiptsResult.error ||
      expensesResult.error ||
      salariesResult.error ||
      fixedCostsResult.error;

    if (firstError) {
      throw new Error(`Loi tai dong tien: ${firstError.message}`);
    }

    const timeline: Timeline = {};

    paymentsResult.data?.forEach((payment) => {
      addAmount(timeline, payment.payment_date, "inflow", Number(payment.amount) || 0);
    });

    receiptsResult.data?.forEach((receipt) => {
      addAmount(timeline, receipt.receipt_date, "inflow", Number(receipt.receipt_amount) || 0);
    });

    expensesResult.data?.forEach((expense) => {
      addAmount(timeline, expense.expense_date, "outflow", Number(expense.amount) || 0);
    });

    for (const slice of monthSlices) {
      const monthStart = buildDate(slice.year, slice.month, 1);
      const monthEnd = buildDate(slice.year, slice.month, lastDayOfMonth(slice.year, slice.month));
      const salaryDate = clampDate(buildDate(slice.year, slice.month, 5), startDate, endDate);
      const fixedCostDate = clampDate(monthStart, startDate, endDate);

      const salary = (salariesResult.data || [])
        .filter((row) => row.year === slice.year && row.month === slice.month)
        .reduce((sum, row) => sum + (Number(row.total_salary) || 0) * slice.ratio, 0);
      addAmount(timeline, salaryDate, "outflow", salary);

      const fixedCost = (fixedCostsResult.data || []).reduce((sum, row) => {
        const amount = Number(row.monthly_amount) || 0;
        if (!amount) return sum;

        const activeFrom = row.start_date || monthStart;
        const activeTo = row.end_date || monthEnd;
        if (activeFrom > monthEnd || activeTo < monthStart) return sum;

        return sum + amount * slice.ratio;
      }, 0);
      addAmount(timeline, fixedCostDate, "outflow", fixedCost);
    }

    return Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date));
  });
}
