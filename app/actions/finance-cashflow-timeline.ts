"use server";

import { withFinanceRead } from "@/lib/auth_utils";
import { asNumber, asString } from "@/lib/finance-utils";
import type { CashflowTimelinePoint } from "@/types/reports";

const MAX_TIMELINE_RANGE_DAYS = 366;
const DAY_MS = 86400000;

function assertTimelineRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    throw new Error("Khoang ngay dong tien khong hop le.");
  }

  const days = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (days > MAX_TIMELINE_RANGE_DAYS) {
    throw new Error("Khoang ngay dong tien khong duoc vuot qua 366 ngay.");
  }
}

export async function getCashflowTimeline(startDate: string, endDate: string) {
  return withFinanceRead(async (supabase) => {
    assertTimelineRange(startDate, endDate);

    const { data, error } = await supabase.rpc("finance_cashflow_timeline", {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      throw new Error(`Loi tai dong tien: ${error.message}`);
    }

    return ((data || []) as Record<string, unknown>[]).map((row) => ({
      date: asString(row.date),
      inflow: asNumber(row.inflow),
      outflow: asNumber(row.outflow),
    })) satisfies CashflowTimelinePoint[];
  });
}
