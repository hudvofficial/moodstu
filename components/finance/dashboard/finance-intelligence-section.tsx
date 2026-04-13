"use client";

import { useSWR, cacheKeys } from "@/lib/swr";
import { 
  getFinanceIntelligence, 
  getCashflowForecast, 
  getExpenseBreakdown, 
  getReceivableAging, 
  getBudgetVsActual 
} from "@/app/actions/finance-intelligence-queries";
import { HealthScoreCard } from "./health-score-card";
import { CashflowRunwayCard } from "./cashflow-runway-card";
import { BreakEvenCard } from "./break-even-card";
import { ForecastChart } from "./forecast-chart";
import { ExpenseDonutChart } from "./expense-donut-chart";
import { AgingBarsChart } from "./aging-bars-chart";
import { BudgetVsActualList } from "./budget-vs-actual-list";
import { SkeletonCard } from "@/components/ui/skeleton";

import type { ActionResult } from "@/types/action-result";

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

interface FinanceIntelligenceSectionProps {
  month: number;
  year: number;
}

export function FinanceIntelligenceSection({ month, year }: FinanceIntelligenceSectionProps) {
  // Global / Current Date dependent metrics (no month/year dependency)
  const { data: healthData, isLoading: isLoadingHealth } = useSWR(
    cacheKeys.financeIntelligence(),
    () => requireData(getFinanceIntelligence())
  );

  const { data: forecastData, isLoading: isLoadingForecast } = useSWR(
    cacheKeys.financeCashflowForecast(30),
    () => requireData(getCashflowForecast(30))
  );

  const { data: agingData, isLoading: isLoadingAging } = useSWR(
    cacheKeys.financeReceivableAging(),
    () => requireData(getReceivableAging())
  );

  // Time-specific metrics (depend on month/year)
  const { data: expenseData, isLoading: isLoadingExpense } = useSWR(
    cacheKeys.financeExpenseBreakdown(month, year),
    () => requireData(getExpenseBreakdown(month, year))
  );

  const { data: budgetData, isLoading: isLoadingBudget } = useSWR(
    cacheKeys.financeBudgetVsActual(month, year),
    () => requireData(getBudgetVsActual(month, year))
  );

  return (
    <div className="space-y-6 mt-8">
      <div>
        <h2 className="section-title">Trí tuệ Tài chính</h2>
        <p className="text-body-sm text-text-secondary mb-4">Các chỉ số phân tích chuyên sâu tự động.</p>
      </div>

      {/* Zone 1: P0 Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoadingHealth ? <SkeletonCard className="h-40" /> : <HealthScoreCard data={healthData || null} />}
        {isLoadingHealth ? <SkeletonCard className="h-40" /> : <CashflowRunwayCard data={healthData || null} />}
        {isLoadingHealth ? <SkeletonCard className="h-40" /> : <BreakEvenCard data={healthData || null} />}
      </section>

      {/* Zone 2: Charts (Forecast, Expense, Aging) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {isLoadingForecast ? <SkeletonCard className="h-[350px]" /> : <ForecastChart data={forecastData || null} />}
        </div>
        <div>
          {isLoadingExpense ? <SkeletonCard className="h-[350px]" /> : <ExpenseDonutChart data={expenseData || null} />}
        </div>
      </section>

      {/* Zone 3: Aging & Budget */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {isLoadingAging ? <SkeletonCard className="h-[350px]" /> : <AgingBarsChart data={agingData || null} />}
        </div>
        <div>
          {isLoadingBudget ? <SkeletonCard className="h-[350px]" /> : <BudgetVsActualList data={budgetData || null} />}
        </div>
      </section>
    </div>
  );
}
