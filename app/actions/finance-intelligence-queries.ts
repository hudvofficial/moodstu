"use server";

import { requireFinanceAccess, withAuth } from "@/lib/auth_utils";
import type { ActionResult } from "@/types/action-result";
import type { 
  FinanceIntelligenceResult, 
  CashflowForecastResult, 
  ExpenseBreakdownItem, 
  ReceivableAgingResult, 
  BudgetVsActualItem,
  FinanceAdvancedIntelligenceResult,
} from "@/types/finance-intelligence";
import { isMissingRpcError } from "@/lib/finance-utils";

export async function getFinanceIntelligence(): Promise<ActionResult<FinanceIntelligenceResult | null>> {
  return withAuth(async (supabase, userId) => {
    await requireFinanceAccess(supabase, userId);

    const { data, error } = await supabase.rpc("get_finance_intelligence");
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      throw new Error(error.message);
    }
    
    return data as FinanceIntelligenceResult;
  });
}

export async function getCashflowForecast(days: number = 30): Promise<ActionResult<CashflowForecastResult | null>> {
  return withAuth(async (supabase, userId) => {
    await requireFinanceAccess(supabase, userId);

    const { data, error } = await supabase.rpc("get_cashflow_forecast", { p_days: days });
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      throw new Error(error.message);
    }
    
    return data as CashflowForecastResult;
  });
}

export async function getExpenseBreakdown(month: number, year: number): Promise<ActionResult<ExpenseBreakdownItem[] | null>> {
  return withAuth(async (supabase, userId) => {
    await requireFinanceAccess(supabase, userId);

    const { data, error } = await supabase.rpc("get_expense_breakdown", { p_month: month, p_year: year });
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      throw new Error(error.message);
    }
    
    return data as ExpenseBreakdownItem[];
  });
}

export async function getReceivableAging(): Promise<ActionResult<ReceivableAgingResult | null>> {
  return withAuth(async (supabase, userId) => {
    await requireFinanceAccess(supabase, userId);

    const { data, error } = await supabase.rpc("get_receivable_aging");
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      throw new Error(error.message);
    }
    
    return data as ReceivableAgingResult;
  });
}

export async function getBudgetVsActual(month: number, year: number): Promise<ActionResult<BudgetVsActualItem[] | null>> {
  return withAuth(async (supabase, userId) => {
    await requireFinanceAccess(supabase, userId);

    const { data, error } = await supabase.rpc("get_budget_vs_actual", { p_month: month, p_year: year });
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      throw new Error(error.message);
    }
    
    return data as BudgetVsActualItem[];
  });
}

export async function getFinanceAdvancedIntelligence(
  month: number,
  year: number,
): Promise<ActionResult<FinanceAdvancedIntelligenceResult | null>> {
  return withAuth(async (supabase, userId) => {
    await requireFinanceAccess(supabase, userId);

    const { data, error } = await supabase.rpc("get_finance_advanced_intelligence", {
      p_month: month,
      p_year: year,
    });

    if (error) {
      if (isMissingRpcError(error)) return null;
      throw new Error(error.message);
    }

    return data as FinanceAdvancedIntelligenceResult;
  });
}
