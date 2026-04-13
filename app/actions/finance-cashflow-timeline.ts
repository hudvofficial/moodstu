"use server";

import { withAuth } from "@/lib/auth_utils";

export async function getCashflowTimeline(startDate: string, endDate: string) {
  return withAuth(async (supabase) => {
    const [{ data: payments }, { data: receipts }, { data: expenses }] = await Promise.all([
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
        .gte("receipt_date", startDate)
        .lte("receipt_date", endDate),
      supabase
        .from("expenses")
        .select("expense_date, amount")
        .is("deleted_at", null)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate),
    ]);

    const timeline: Record<string, { date: string; inflow: number; outflow: number }> = {};
    payments?.forEach((p) => {
      const d = p.payment_date;
      if (!timeline[d]) timeline[d] = { date: d, inflow: 0, outflow: 0 };
      timeline[d].inflow += Number(p.amount) || 0;
    });
    receipts?.forEach((r) => {
      const d = r.receipt_date;
      if (!timeline[d]) timeline[d] = { date: d, inflow: 0, outflow: 0 };
      timeline[d].inflow += Number(r.receipt_amount) || 0;
    });
    expenses?.forEach((e) => {
      const d = e.expense_date;
      if (!timeline[d]) timeline[d] = { date: d, inflow: 0, outflow: 0 };
      timeline[d].outflow += Number(e.amount) || 0;
    });

    return Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date));
  });
}
