"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { requireFinanceAccess, withAuth } from "@/lib/auth_utils";
import { profileAction } from "@/lib/action-profiler";
import { isMissingRpcError } from "@/lib/finance-utils";
import type { ActionResult } from "@/types/action-result";
import type {
  BudgetVsActualItem,
  CashflowForecastResult,
  ExpenseBreakdownItem,
  FinanceAdvancedIntelligenceResult,
  FinanceIntelligenceResult,
  ReceivableAgingResult,
} from "@/types/finance-intelligence";

const FINANCE_INTELLIGENCE_BASIS_TABLES = [
  "contracts",
  "payments",
  "receipts",
  "expenses",
  "debts",
  "budgets",
  "fixed_costs",
  "financial_goals",
  "payment_plans",
] as const;

async function hasFinanceIntelligenceBasis(supabase: SupabaseClient) {
  const checks = await Promise.all(
    FINANCE_INTELLIGENCE_BASIS_TABLES.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true });

      if (error) throw new Error(error.message);
      return (count || 0) > 0;
    }),
  );

  return checks.some(Boolean);
}

export async function getFinanceIntelligence(): Promise<ActionResult<FinanceIntelligenceResult | null>> {
  return profileAction("finance.getFinanceIntelligence", () =>
    withAuth(async (supabase: SupabaseClient<Database>, userId) => {
      await requireFinanceAccess(supabase, userId);

      if (!(await hasFinanceIntelligenceBasis(supabase))) {
        return null;
      }

      const { data, error } = await supabase.rpc("get_finance_intelligence");

      if (error) {
        if (isMissingRpcError(error)) return null;
        throw new Error(error.message);
      }

      return data as unknown as FinanceIntelligenceResult;
    }),
  );
}

export async function getCashflowForecast(days: number = 30): Promise<ActionResult<CashflowForecastResult | null>> {
  return profileAction("finance.getCashflowForecast", () =>
    withAuth(async (supabase: SupabaseClient<Database>, userId) => {
      await requireFinanceAccess(supabase, userId);

      const { data, error } = await supabase.rpc("get_cashflow_forecast", { p_days: days });

      if (error) {
        if (isMissingRpcError(error)) return null;
        throw new Error(error.message);
      }

      return data as unknown as CashflowForecastResult;
    }),
  );
}

export async function getExpenseBreakdown(month: number, year: number): Promise<ActionResult<ExpenseBreakdownItem[] | null>> {
  return profileAction("finance.getExpenseBreakdown", () =>
    withAuth(async (supabase: SupabaseClient<Database>, userId) => {
      await requireFinanceAccess(supabase, userId);

      const { data, error } = await supabase.rpc("get_expense_breakdown", { p_month: month, p_year: year });

      if (error) {
        if (isMissingRpcError(error)) return null;
        throw new Error(error.message);
      }

      return data as unknown as ExpenseBreakdownItem[];
    }),
  );
}

export async function getReceivableAging(): Promise<ActionResult<ReceivableAgingResult | null>> {
  return profileAction("finance.getReceivableAging", () =>
    withAuth(async (supabase: SupabaseClient<Database>, userId) => {
      await requireFinanceAccess(supabase, userId);

      const { data, error } = await supabase.rpc("get_receivable_aging");

      if (error) {
        if (isMissingRpcError(error)) return null;
        throw new Error(error.message);
      }

      return data as unknown as ReceivableAgingResult;
    }),
  );
}

export async function getBudgetVsActual(month: number, year: number): Promise<ActionResult<BudgetVsActualItem[] | null>> {
  return profileAction("finance.getBudgetVsActual", () =>
    withAuth(async (supabase: SupabaseClient<Database>, userId) => {
      await requireFinanceAccess(supabase, userId);

      const { data, error } = await supabase.rpc("get_budget_vs_actual", { p_month: month, p_year: year });

      if (error) {
        if (isMissingRpcError(error)) return null;
        throw new Error(error.message);
      }

      return data as unknown as BudgetVsActualItem[];
    }),
  );
}

export async function getFinanceAdvancedIntelligence(
  month: number,
  year: number,
): Promise<ActionResult<FinanceAdvancedIntelligenceResult | null>> {
  return profileAction("finance.getFinanceAdvancedIntelligence", () =>
    withAuth(async (supabase: SupabaseClient<Database>, userId) => {
      await requireFinanceAccess(supabase, userId);

      const { data, error } = await supabase.rpc("get_finance_advanced_intelligence", {
        p_month: month,
        p_year: year,
      });

      if (error) {
        if (isMissingRpcError(error)) return null;
        throw new Error(error.message);
      }

      return data as unknown as FinanceAdvancedIntelligenceResult;
    }),
  );
}
