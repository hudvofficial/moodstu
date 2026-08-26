"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchLedger,
  getMonthSummary,
  getPendingCollections,
  getRevenueByMonth,
  getServiceDistribution,
  getUpcomingContracts,
} from "@/app/actions/finance-dashboard-queries";
import { FinanceQuickNav } from "@/components/finance/dashboard/finance-quick-nav";
import { FinanceFilters } from "@/components/finance/dashboard/finance-filters";
import { PendingCollections } from "@/components/finance/dashboard/pending-collections";
import { RecentTransactions } from "@/components/finance/dashboard/recent-transactions";
import { SmartDashboardBanner } from "@/components/finance/dashboard/smart-dashboard-banner";
import { UpcomingContracts } from "@/components/finance/dashboard/upcoming-contracts";
import { FinanceCompactBar } from "@/components/finance/dashboard/finance-compact-bar";

import { SkeletonCard } from "@/components/ui/skeleton";
import { cacheKeys, useSWR } from "@/lib/swr";
import type { ActionResult } from "@/types/action-result";
import type { Role } from "@/types/roles";
import type {
  ContractProfitRow,
  FinanceContractListItem,
  LedgerItem,
  MonthSummary,
  PaginatedResult,
  RevenueByMonthItem,
  ServiceDistributionItem,
} from "@/types/finance-dashboard";

const ProfitReportTable = dynamic(
  () => import("./profit-report-table").then((mod) => mod.ProfitReportTable),
  { ssr: false, loading: () => <ProfitReportSkeleton /> },
);
const FinanceIntelligenceSection = dynamic(
  () => import("./finance-intelligence-section").then((mod) => mod.FinanceIntelligenceSection),
  { ssr: false, loading: () => <IntelligenceSkeleton /> },
);
const RevenueBarChart = dynamic(
  () => import("./revenue-bar-chart").then((mod) => mod.RevenueBarChart),
  { ssr: false, loading: () => <SkeletonCard className="h-80" /> },
);
const ServiceDonutChart = dynamic(
  () => import("./service-donut-chart").then((mod) => mod.ServiceDonutChart),
  { ssr: false, loading: () => <SkeletonCard className="h-80" /> },
);

interface FinanceDashboardClientProps {
  initialMonth: number;
  initialYear: number;
  role?: Role;
  initialMetrics?: MonthSummary;
  initialRevenue?: RevenueByMonthItem[];
  initialServices?: ServiceDistributionItem[];
  initialUpcoming?: FinanceContractListItem[];
  initialPending?: FinanceContractListItem[];
  initialLedger?: PaginatedResult<LedgerItem>;
  initialProfit?: PaginatedResult<ContractProfitRow>;
}

const EMPTY_SUMMARY: MonthSummary = {
  month: 0,
  year: 0,
  cash: { in: 0, inContract: 0, inRetail: 0, out: 0, outSettlement: 0, outOther: 0, net: 0, netPrev: 0 },
  pnl: {
    revenue: 0, revenueContract: 0, revenueRetail: 0, cost: 0, costTask: 0, costPrint: 0, costCogs: 0, costDirect: 0,
    costOverhead: 0, costSalaryBase: 0, profit: 0, profitPrev: 0, margin: 0, contractsShot: 0, contractsMissingWorkDate: 0,
  },
  debt: { receivable: 0, receivableDue: 0, receivableWaiting: 0, payable: 0, payableLab: 0, payableVendor: 0, payableSupplier: 0, payableEmployee: 0 },
};

const EMPTY_LEDGER: PaginatedResult<LedgerItem> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 5,
};

const HYDRATED_FALLBACK_OPTIONS = {
  revalidateOnMount: false,
  revalidateIfStale: false,
} as const;

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

function useDeferredFinanceSections() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const w = window as IdleWindow;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const show = () => setIsReady(true);

    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(show, { timeout: 900 });
    } else {
      timeoutId = window.setTimeout(show, 350);
    }

    return () => {
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return isReady;
}

function ProfitReportSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonCard className="h-28" />
      <SkeletonCard className="h-72" />
    </div>
  );
}

function IntelligenceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonCard className="h-[350px] md:col-span-2" />
        <SkeletonCard className="h-[350px]" />
      </div>
    </div>
  );
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) {
    const errorMsg = result.error || "Lỗi không xác định";
    if (errorMsg.includes("502") || errorMsg.includes("504") || errorMsg.includes("<html") || errorMsg.includes("cloudflare")) {
      throw new Error("Lỗi kết nối máy chủ (502). Vui lòng tải lại trang.");
    }
    throw new Error(errorMsg);
  }
  return result.data;
}

export function FinanceDashboardClient(props: FinanceDashboardClientProps) {
  const [month, setMonth] = useState(props.initialMonth);
  const [year, setYear] = useState(props.initialYear);
  const showDeferredSections = useDeferredFinanceSections();

  const handleMonthChange = useCallback((value: string) => setMonth(Number(value)), []);
  const handleYearChange = useCallback((value: string) => setYear(Number(value)), []);

  const currentMonth = props.initialMonth;
  const currentYear = props.initialYear;

  // Ba số của tháng hiện tại (Két · Lãi/lỗ · Công nợ) — luôn theo tháng thật, realtime invalidation
  const metrics = useSWR(
    cacheKeys.financeDashboard(currentMonth, currentYear),
    () => requireData(getMonthSummary(currentMonth, currentYear)),
    props.initialMetrics ? { fallbackData: props.initialMetrics, ...HYDRATED_FALLBACK_OPTIONS } : undefined,
  );

  // Filtered Data for Reports Section
  const revenue = useSWR(
    showDeferredSections || props.initialRevenue ? cacheKeys.financeRevenue(year) : null,
    () => requireData(getRevenueByMonth(year)),
    props.initialRevenue ? { fallbackData: props.initialRevenue, ...HYDRATED_FALLBACK_OPTIONS } : undefined,
  );
  const services = useSWR(
    showDeferredSections || props.initialServices ? cacheKeys.financeServiceDist(month, year) : null,
    () => requireData(getServiceDistribution(month, year)),
    props.initialServices ? { fallbackData: props.initialServices, ...HYDRATED_FALLBACK_OPTIONS } : undefined,
  );
  const upcoming = useSWR(
    showDeferredSections || props.initialUpcoming ? cacheKeys.financeUpcoming() : null,
    () => requireData(getUpcomingContracts(5)),
    props.initialUpcoming ? { fallbackData: props.initialUpcoming, ...HYDRATED_FALLBACK_OPTIONS } : undefined,
  );
  const pending = useSWR(
    showDeferredSections || props.initialPending ? cacheKeys.financePending() : null,
    () => requireData(getPendingCollections(5)),
    props.initialPending ? { fallbackData: props.initialPending, ...HYDRATED_FALLBACK_OPTIONS } : undefined,
  );
  const ledger = useSWR(
    showDeferredSections || props.initialLedger ? cacheKeys.financeLedger(1, currentMonth, currentYear, "all") : null,
    () => requireData(fetchLedger({ page: 1, pageSize: 5, month: currentMonth, year: currentYear, type: "all" })),
    props.initialLedger ? { fallbackData: props.initialLedger, ...HYDRATED_FALLBACK_OPTIONS } : undefined,
  );

  useEffect(() => {
    const firstError = metrics.error || revenue.error || services.error || upcoming.error || pending.error || ledger.error;
    if (firstError) toast.error(firstError.message || "Không tải được dữ liệu tài chính.");
  }, [metrics.error, revenue.error, services.error, upcoming.error, pending.error, ledger.error]);

  const data = metrics.data || props.initialMetrics || { ...EMPTY_SUMMARY, month: currentMonth, year: currentYear };
  const isBootstrapping = !props.initialMetrics && metrics.isLoading;

  return (
    <div className="main-container gap-3!" suppressHydrationWarning>
      {/* ── Ba số của tháng: Két · Lãi/lỗ · Công nợ (ADR-016 M2) ── */}
      <section className="space-y-3" suppressHydrationWarning>
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title min-w-0 truncate">Tháng này</h2>
          <div className="shrink-0 flex text-caption font-medium text-text-muted items-center gap-1.5 bg-bg-hover px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Cập nhật: Tháng {currentMonth}/{currentYear}
          </div>
        </div>
        {isBootstrapping ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SkeletonCard className="h-44" />
            <SkeletonCard className="h-44" />
            <SkeletonCard className="h-44" />
          </div>
        ) : (
          <FinanceCompactBar data={data} />
        )}
      </section>

      <FinanceQuickNav role={props.role} />

      <SmartDashboardBanner />

      <section className="entrance entrance-2 mt-4" suppressHydrationWarning>
        {showDeferredSections ? <ProfitReportTable initialData={props.initialProfit} /> : <ProfitReportSkeleton />}
      </section>

      <section className="space-y-4 entrance entrance-3 mt-4" suppressHydrationWarning>
        <div className="flex flex-row items-center justify-between gap-2 lg:gap-3" suppressHydrationWarning>
          <h2 className="section-title min-w-0 truncate">Trí tuệ Tài chính & Báo cáo</h2>
          <FinanceFilters
            month={month}
            year={year}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
            initialYear={props.initialYear}
          />
        </div>

        {showDeferredSections ? <FinanceIntelligenceSection month={month} year={year} /> : <IntelligenceSkeleton />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 mt-4">
          <div className="lg:col-span-3">
            {!showDeferredSections || (revenue.isLoading && !revenue.data) ? (
              <SkeletonCard className="h-80" />
            ) : (
              <RevenueBarChart data={revenue.data || props.initialRevenue || []} selectedMonth={month} />
            )}
          </div>
          <div className="lg:col-span-2">
            {!showDeferredSections || (services.isLoading && !services.data) ? (
              <SkeletonCard className="h-80" />
            ) : (
              <ServiceDonutChart data={services.data || props.initialServices || []} />
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 entrance entrance-4 mt-4" suppressHydrationWarning>
        <h2 className="section-title">Cập nhật mới nhất</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {!showDeferredSections && !props.initialUpcoming ? (
            <SkeletonCard className="h-64" />
          ) : (
            <UpcomingContracts data={upcoming.data || props.initialUpcoming || []} />
          )}
          {!showDeferredSections && !props.initialPending ? (
            <SkeletonCard className="h-64" />
          ) : (
            <PendingCollections data={pending.data || props.initialPending || []} />
          )}
          {!showDeferredSections && !props.initialLedger ? (
            <SkeletonCard className="h-64" />
          ) : (
            <RecentTransactions data={(ledger.data || props.initialLedger || EMPTY_LEDGER).items} />
          )}
        </div>
      </section>
    </div>
  );
}
