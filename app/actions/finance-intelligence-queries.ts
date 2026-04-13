"use server";

import { withAuth } from "@/lib/auth_utils";
import type { ActionResult } from "@/types/action-result";
import type { 
  FinanceIntelligenceResult, 
  CashflowForecastResult, 
  ExpenseBreakdownItem, 
  ReceivableAgingResult, 
  BudgetVsActualItem 
} from "@/types/finance-intelligence";
import { isMissingRpcError } from "@/lib/finance-utils";
import { 
  MOCK_FINANCE_INTELLIGENCE, 
  MOCK_CASHFLOW_FORECAST, 
  MOCK_EXPENSE_BREAKDOWN, 
  MOCK_RECEIVABLE_AGING, 
  MOCK_BUDGET_VS_ACTUAL 
} from "@/lib/finance-mock-data";

const USE_MOCK = true; // TODO: REMOVE BEFORE PROD

export async function getFinanceIntelligence(): Promise<ActionResult<FinanceIntelligenceResult | null>> {
  if (USE_MOCK) return { success: true, data: MOCK_FINANCE_INTELLIGENCE };
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("get_finance_intelligence");
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      console.error("Error in getFinanceIntelligence:", error);
      throw new Error(error.message);
    }
    
    return data as FinanceIntelligenceResult;
  });
}

export async function getCashflowForecast(days: number = 30): Promise<ActionResult<CashflowForecastResult | null>> {
  if (USE_MOCK) return { success: true, data: MOCK_CASHFLOW_FORECAST };
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("get_cashflow_forecast", { p_days: days });
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      console.error("Error in getCashflowForecast:", error);
      throw new Error(error.message);
    }
    
    return data as CashflowForecastResult;
  });
}

export async function getExpenseBreakdown(month: number, year: number): Promise<ActionResult<ExpenseBreakdownItem[] | null>> {
  if (USE_MOCK) return { success: true, data: MOCK_EXPENSE_BREAKDOWN };
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("get_expense_breakdown", { p_month: month, p_year: year });
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      console.error("Error in getExpenseBreakdown:", error);
      throw new Error(error.message);
    }
    
    return data as ExpenseBreakdownItem[];
  });
}

export async function getReceivableAging(): Promise<ActionResult<ReceivableAgingResult | null>> {
  if (USE_MOCK) return { success: true, data: MOCK_RECEIVABLE_AGING };
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("get_receivable_aging");
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      console.error("Error in getReceivableAging:", error);
      throw new Error(error.message);
    }
    
    return data as ReceivableAgingResult;
  });
}

export async function getBudgetVsActual(month: number, year: number): Promise<ActionResult<BudgetVsActualItem[] | null>> {
  if (USE_MOCK) return { success: true, data: MOCK_BUDGET_VS_ACTUAL };
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("get_budget_vs_actual", { p_month: month, p_year: year });
    
    if (error) {
      if (isMissingRpcError(error)) return null;
      console.error("Error in getBudgetVsActual:", error);
      throw new Error(error.message);
    }
    
    return data as BudgetVsActualItem[];
  });
}
