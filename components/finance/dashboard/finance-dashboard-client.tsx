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
import { ProfitReportTable } from "@/components/finance/dashboard/profit-report-table";
import { RecentTransactions } from "@/components/finance/dashboard/recent-transactions";
import { SmartDashboardBanner } from "@/components/finance/dashboard/smart-dashboard-banner";
import { UpcomingContracts } from "@/components/finance/dashboard/upcoming-contracts";
import { FinanceCompactBar } from "@/components/finance/dashboard/finance-compact-bar";

import { SkeletonCard } from "@/components/ui/skeleton";
import { cacheKeys, useSWR } from "@/lib/swr";
import { FinanceIntelligenceSection } from "./finance-intelligence-section";
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
  initialMetrics: DashboardMetrics;
  initialRevenue: RevenueByMonthItem[];
  initialServices: ServiceDistributionItem[];
  initialUpcoming: FinanceContractListItem[];
  initialPending: FinanceContractListItem[];
  initialLedger: PaginatedResult<LedgerItem>;
  initialProfit: PaginatedResult<ContractProfitRow>;
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

  const handleMonthChange = useCallback((value: string) => setMonth(Number(value)), []);
  const handleYearChange = useCallback((value: string) => setYear(Number(value)), []);

  const currentMonth = props.initialMonth;
  const currentYear = props.initialYear;

  // Top-level Dashboard Snapshot (Always tracks current real-time month via realtime invalidation)
  const metrics = useSWR(
    cacheKeys.financeDashboard(currentMonth, currentYear),
    () => requireData(getDashboardMetrics(currentMonth, currentYear)),
    { fallbackData: props.initialMetrics },
  );

  // Filtered Data for Reports Section
  const revenue = useSWR(
    cacheKeys.financeRevenue(year),
    () => requireData(getRevenueByMonth(year)),
    { fallbackData: props.initialRevenue },
  );
  const services = useSWR(
    cacheKeys.financeServiceDist(month, year),
    () => requireData(getServiceDistribution(month, year)),
    { fallbackData: props.initialServices },
  );
  const upcoming = useSWR(
    cacheKeys.financeUpcoming(),
    () => requireData(getUpcomingContracts(5)),
    { fallbackData: props.initialUpcoming },
  );
  const pending = useSWR(
    cacheKeys.financePending(),
    () => requireData(getPendingCollections(5)),
    { fallbackData: props.initialPending },
  );
  const ledger = useSWR(
    cacheKeys.financeLedger(1, currentMonth, currentYear, "all"),
    () => requireData(fetchLedger({ page: 1, pageSize: 5, month: currentMonth, year: currentYear, type: "all" })),
    { fallbackData: props.initialLedger },
  );

  useEffect(() => {
    const firstError = metrics.error || revenue.error || services.error || upcoming.error || pending.error || ledger.error;
    if (firstError) toast.error(firstError.message || "Không tải được dữ liệu tài chính.");
  }, [metrics.error, revenue.error, services.error, upcoming.error, pending.error, ledger.error]);

  const data = metrics.data || props.initialMetrics;

  return (
    <div className="main-container gap-3!">
      {/* ── Tổng quan tài chính: Snapshot Hiện Tại ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-sm">
        <div className="flex-1 min-w-0">
          <FinanceCompactBar data={data} />
        </div>
        <div className="shrink-0 flex lg:justify-end text-caption font-medium text-text-muted items-center gap-1.5 bg-bg-hover px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Cập nhật: Tháng {currentMonth}/{currentYear}
        </div>
      </div>

      <FinanceQuickNav />

      <SmartDashboardBanner />

      <section className="entrance entrance-2 mt-4">
        <ProfitReportTable initialData={props.initialProfit} />
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
        
        <FinanceIntelligenceSection month={month} year={year} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 mt-4">
          <div className="lg:col-span-3">
            <RevenueBarChart data={revenue.data || props.initialRevenue} selectedMonth={month} />
          </div>
          <div className="lg:col-span-2">
            <ServiceDonutChart data={services.data || props.initialServices} />
          </div>
        </div>
      </section>

      <section className="space-y-4 entrance entrance-4 mt-4">
        <h2 className="section-title">Cập nhật mới nhất</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <UpcomingContracts data={upcoming.data || props.initialUpcoming} />
          <PendingCollections data={pending.data || props.initialPending} />
          <RecentTransactions data={(ledger.data || props.initialLedger).items} />
        </div>
      </section>
    </div>
  );
}
