"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchLedger,
  getDashboardMetrics,
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
import type {
  ContractProfitRow,
  DashboardMetrics,
  FinanceContractListItem,
  LedgerItem,
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
  initialMetrics?: DashboardMetrics;
  initialRevenue?: RevenueByMonthItem[];
  initialServices?: ServiceDistributionItem[];
  initialUpcoming?: FinanceContractListItem[];
  initialPending?: FinanceContractListItem[];
  initialLedger?: PaginatedResult<LedgerItem>;
  initialProfit?: PaginatedResult<ContractProfitRow>;
}

const EMPTY_METRICS: DashboardMetrics = {
  totalInflow: 0,
  totalOutflow: 0,
  profit: 0,
  monthChangePercent: 0,
  contractsNew: 0,
  contractsDone: 0,
  totalDebt: 0,
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

  // Top-level Dashboard Snapshot (Always tracks current real-time month via realtime invalidation)
  const metrics = useSWR(
    cacheKeys.financeDashboard(currentMonth, currentYear),
    () => requireData(getDashboardMetrics(currentMonth, currentYear)),
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

  const data = metrics.data || props.initialMetrics || EMPTY_METRICS;
  const isBootstrapping = !props.initialMetrics && metrics.isLoading;

  return (
    <div className="main-container gap-3!">
      {/* ── Tổng quan tài chính: Snapshot Hiện Tại ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-sm">
        <div className="flex-1 min-w-0">
          {isBootstrapping ? <SkeletonCard className="h-16" /> : <FinanceCompactBar data={data} />}
        </div>
        <div className="shrink-0 flex lg:justify-end text-caption font-medium text-text-muted items-center gap-1.5 bg-bg-hover px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Cập nhật: Tháng {currentMonth}/{currentYear}
        </div>
      </div>

      <FinanceQuickNav />

      <SmartDashboardBanner />

      <section className="entrance entrance-2 mt-4">
        {showDeferredSections ? <ProfitReportTable initialData={props.initialProfit} /> : <ProfitReportSkeleton />}
      </section>

      <section className="space-y-4 entrance entrance-3 mt-4">
        <div className="flex flex-row items-center justify-between gap-2 lg:gap-3">
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

      <section className="space-y-4 entrance entrance-4 mt-4">
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
