import type { PaymentPlan } from "@/types/contract";

/**
 * Shared payment-plan mapping (server actions + client-direct fetchers).
 * Extracted from app/actions/contract-queries.ts so the browser drawer
 * fetcher reuses the EXACT same transform (no logic drift). Pure — no
 * server-only deps.
 */

export type PaymentPlanRow = PaymentPlan & {
  payment_plan_allocations?: Array<{
    id: string;
    contract_id: string;
    payment_plan_id: string;
    payment_id: string;
    amount: number;
    created_at: string;
    created_by: string | null;
  }> | null;
};

export function normalizePlanStatus(status: string | null | undefined, paidAmount: number, amount: number) {
  const raw = String(status || "pending").toLowerCase();
  if (raw === "cancelled" || raw === "da_huy" || raw === "huy") return "cancelled";
  if (raw === "paid" || raw === "closed" || raw === "da_thanh_toan") return "paid";
  if (amount <= 0) return paidAmount > 0 ? "partial" : "pending";
  if (paidAmount <= 0) return "pending";
  if (paidAmount + 0.01 >= amount) return "paid";
  return "partial";
}

export function mapPaymentPlans(rows: Partial<PaymentPlanRow>[] | null | undefined): PaymentPlan[] {
  return ((rows || []) as PaymentPlanRow[])
    .map((plan) => {
      const allocations = plan.payment_plan_allocations || plan.allocations || [];
      const paidAmount = allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
      const amount = Number(plan.amount || 0);
      const remainingAmount = amount > 0 ? Math.max(0, amount - paidAmount) : 0;

      return {
        id: plan.id,
        contract_id: plan.contract_id,
        stage_name: plan.stage_name,
        stage_key: plan.stage_key || null,
        sort_order: Number(plan.sort_order || 0),
        amount,
        due_date: plan.due_date,
        status: normalizePlanStatus(plan.status, paidAmount, amount),
        receipt_id: plan.receipt_id,
        created_at: plan.created_at,
        allocations,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
      };
    })
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
}
