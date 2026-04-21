import Link from "next/link";
import { cache, Suspense } from "react";
import { ArrowLeft, Gauge } from "lucide-react";
import {
  getBudgetVsActual,
  getCashflowForecast,
  getExpenseBreakdown,
  getFinanceAdvancedIntelligence,
  getFinanceIntelligence,
  getReceivableAging,
} from "@/app/actions/finance-intelligence-queries";
import {
  getRevenueByMonth,
  getServiceDistribution,
} from "@/app/actions/finance-dashboard-queries";
import { AdvancedKpiGrid } from "@/components/finance/dashboard/advanced-kpi-grid";
import { AgingBarsChart } from "@/components/finance/dashboard/aging-bars-chart";
import { BreakEvenCard } from "@/components/finance/dashboard/break-even-card";
import { BudgetVsActualList } from "@/components/finance/dashboard/budget-vs-actual-list";
import { CashflowRunwayCard } from "@/components/finance/dashboard/cashflow-runway-card";
import { CustomerMetricsCard } from "@/components/finance/dashboard/customer-metrics-card";
import { DressRoiCard } from "@/components/finance/dashboard/dress-roi-card";
import { ExpenseDonutChart } from "@/components/finance/dashboard/expense-donut-chart";
import { ForecastChart } from "@/components/finance/dashboard/forecast-chart";
import { HealthScoreCard } from "@/components/finance/dashboard/health-score-card";
import { InventoryCostsCard } from "@/components/finance/dashboard/inventory-costs-card";
import { RevenueBarChart } from "@/components/finance/dashboard/revenue-bar-chart";
import { RevenueBreakdownCard } from "@/components/finance/dashboard/revenue-breakdown-card";
import { ScenarioPlanningCard } from "@/components/finance/dashboard/scenario-planning-card";
import { ServiceDonutChart } from "@/components/finance/dashboard/service-donut-chart";
import { SkeletonCard } from "@/components/ui/skeleton";
import type { ActionResult } from "@/types/action-result";

export const metadata = { title: "Dashboard thông minh | Mood Studio" };
export const dynamic = "force-dynamic";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

function getPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

const getCachedFinanceIntelligence = cache(getFinanceIntelligence);
const getCachedCashflowForecast = cache(getCashflowForecast);
const getCachedReceivableAging = cache(getReceivableAging);
const getCachedExpenseBreakdown = cache(getExpenseBreakdown);
const getCachedBudgetVsActual = cache(getBudgetVsActual);
const getCachedFinanceAdvancedIntelligence = cache(getFinanceAdvancedIntelligence);
const getCachedRevenueByMonth = cache(getRevenueByMonth);
const getCachedServiceDistribution = cache(getServiceDistribution);

function ZoneSkeleton({ className = "h-44" }: { className?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SkeletonCard className={className} />
      <SkeletonCard className={className} />
      <SkeletonCard className={className} />
    </div>
  );
}

async function CriticalIntelligenceZone() {
  const intelligence = unwrap(await getCachedFinanceIntelligence(), null);

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <HealthScoreCard data={intelligence} />
      <CashflowRunwayCard data={intelligence} />
      <BreakEvenCard data={intelligence} />
    </section>
  );
}

async function ForecastZone() {
  const { month, year } = getPeriod();
  const [forecastResult, expenseResult, agingResult] = await Promise.all([
    getCachedCashflowForecast(30),
    getCachedExpenseBreakdown(month, year),
    getCachedReceivableAging(),
  ]);

  const forecast = unwrap(forecastResult, null);
  const expenses = unwrap(expenseResult, null);
  const aging = unwrap(agingResult, null);

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <ForecastChart data={forecast} />
      </div>
      <ExpenseDonutChart data={expenses} />
      <div className="xl:col-span-3">
        <AgingBarsChart data={aging} />
      </div>
    </section>
  );
}

async function DetailIntelligenceZone() {
  const { month, year } = getPeriod();
  const [budgetResult, revenueResult, servicesResult, advancedResult] = await Promise.all([
    getCachedBudgetVsActual(month, year),
    getCachedRevenueByMonth(year),
    getCachedServiceDistribution(month, year),
    getCachedFinanceAdvancedIntelligence(month, year),
  ]);

  const budget = unwrap(budgetResult, null);
  const revenue = unwrap(revenueResult, []);
  const services = unwrap(servicesResult, []);
  const advanced = unwrap(advancedResult, null);

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <div className="xl:col-span-2">
        <BudgetVsActualList data={budget} />
      </div>
      <div className="xl:col-span-3">
        <RevenueBarChart data={revenue} selectedMonth={month} />
      </div>
      <div className="xl:col-span-5">
        <ServiceDonutChart data={services} title="Doanh thu theo dịch vụ" />
      </div>
      {advanced ? (
        <>
          <div className="xl:col-span-5">
            <AdvancedKpiGrid data={advanced.advancedKPIs} />
          </div>
          <div className="xl:col-span-5">
            <ScenarioPlanningCard data={advanced.scenarios} />
          </div>
          <div className="xl:col-span-2">
            <CustomerMetricsCard data={advanced.customerMetrics} />
          </div>
          <div className="xl:col-span-3">
            <RevenueBreakdownCard data={advanced.revenueBreakdown} />
          </div>
          <div className="xl:col-span-2">
            <DressRoiCard data={advanced.dressROI} />
          </div>
          <div className="xl:col-span-3">
            <InventoryCostsCard data={advanced.inventoryCosts} />
          </div>
        </>
      ) : null}
    </section>
  );
}

export default function FinanceSmartDashboardPage() {
  const { month, year } = getPeriod();

  return (
    <main className="main-container gap-4!">
      <div className="card-base p-4 entrance entrance-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="icon-box bg-primary/10 text-primary">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-overline text-text-muted">Tháng {month}/{year}</p>
              <h1 className="text-h1">Dashboard thông minh</h1>
              <p className="mt-1 max-w-2xl text-body-sm text-text-secondary">
                Sức khỏe tài chính, hòa vốn, runway và dự báo dòng tiền được tính từ dữ liệu production.
              </p>
            </div>
          </div>
          <Link href="/finance" className="btn-secondary w-fit">
            <ArrowLeft className="h-4 w-4" />
            Về tổng quan
          </Link>
        </div>
      </div>

      <div className="entrance entrance-2">
        <Suspense fallback={<ZoneSkeleton />}>
          <CriticalIntelligenceZone />
        </Suspense>
      </div>

      <div className="entrance entrance-3">
        <Suspense fallback={<ZoneSkeleton className="h-80" />}>
          <ForecastZone />
        </Suspense>
      </div>

      <div className="entrance entrance-4">
        <Suspense fallback={<ZoneSkeleton className="h-72" />}>
          <DetailIntelligenceZone />
        </Suspense>
      </div>
    </main>
  );
}
