"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
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
import { PendingCollections } from "@/components/finance/dashboard/pending-collections";
import { ProfitReportTable } from "@/components/finance/dashboard/profit-report-table";
import { RecentTransactions } from "@/components/finance/dashboard/recent-transactions";
import { SmartDashboardBanner } from "@/components/finance/dashboard/smart-dashboard-banner";
import { UpcomingContracts } from "@/components/finance/dashboard/upcoming-contracts";
import { FinanceCompactBar } from "@/components/finance/dashboard/finance-compact-bar";
import { SimpleSelect } from "@/components/ui/simple-select";
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

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function FinanceDashboardClient(props: FinanceDashboardClientProps) {
  const [month, setMonth] = useState(props.initialMonth);
  const [year, setYear] = useState(props.initialYear);
  const years = [props.initialYear - 1, props.initialYear, props.initialYear + 1];
  const monthOptions = MONTHS.map((item) => ({ value: String(item), label: `Tháng ${item}` }));
  const yearOptions = years.map((item) => ({ value: String(item), label: String(item) }));

  const metrics = useSWR(
    cacheKeys.financeDashboard(month, year),
    () => requireData(getDashboardMetrics(month, year)),
    { fallbackData: props.initialMetrics },
  );
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
    cacheKeys.financeLedger(1, month, year, "all"),
    () => requireData(fetchLedger({ page: 1, pageSize: 5, month, year, type: "all" })),
    { fallbackData: props.initialLedger },
  );

  useEffect(() => {
    const firstError = metrics.error || revenue.error || services.error || upcoming.error || pending.error || ledger.error;
    if (firstError) toast.error(firstError.message || "Không tải được dữ liệu tài chính.");
  }, [metrics.error, revenue.error, services.error, upcoming.error, pending.error, ledger.error]);

  const data = metrics.data || props.initialMetrics;

  return (
    <>
      <div className="flex justify-end gap-2">
        <SimpleSelect value={String(month)} onChange={(value) => setMonth(Number(value))} options={monthOptions} />
        <SimpleSelect value={String(year)} onChange={(value) => setYear(Number(value))} options={yearOptions} />
      </div>

      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs mt-6">
        <FinanceCompactBar data={data} />
        <div className="hidden lg:flex">
          <Link href="/finance/receipts" className="btn btn-primary gap-2 shrink-0">
            <Plus className="w-5 h-5" />
            <span>Khai báo Thu</span>
          </Link>
        </div>
      </div>

      <SmartDashboardBanner />

      <FinanceQuickNav />

      <FinanceIntelligenceSection month={month} year={year} />



      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5 entrance entrance-3">
        <div className="lg:col-span-3">
          <RevenueBarChart data={revenue.data || props.initialRevenue} selectedMonth={month} />
        </div>
        <div className="lg:col-span-2">
          <ServiceDonutChart data={services.data || props.initialServices} />
        </div>
      </section>

      <section className="space-y-4 entrance entrance-4">
        <h2 className="section-title">Cập nhật mới nhất</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UpcomingContracts data={upcoming.data || props.initialUpcoming} />
        <PendingCollections data={pending.data || props.initialPending} />
        <RecentTransactions data={(ledger.data || props.initialLedger).items} />
        </div>
      </section>

      <section className="entrance entrance-5">
        <ProfitReportTable initialData={props.initialProfit} />
      </section>
    </>
  );
}
