"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fetchLedger,
  getPendingCollections,
} from "@/app/actions/finance-dashboard-queries";
import { getCashflowTimeline } from "@/app/actions/finance-cashflow-timeline";
import { getReportsSnapshot } from "@/app/actions/finance-reports-queries";
import { fetchDebtStats, type DebtStats } from "@/app/actions/finance-operations-queries";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SkeletonCard } from "@/components/ui/skeleton";
import { DebtStatsBar } from "@/components/finance/debts/debt-stats-bar";
import { ReportsDebtsView } from "@/components/reports/reports-debts-view";
import { exportReportsWorkbook } from "@/components/reports/reports-export";
import { ReportsFilters } from "@/components/reports/reports-filters";
import { ReportsOverviewView } from "@/components/reports/reports-overview-view";
import { ReportsPageActions } from "@/components/reports/reports-page-actions";
import { ReportsStatsBar } from "@/components/reports/reports-stats-bar";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { getReportPeriodKey, getReportRange } from "@/lib/report-period";
import { cacheKeys, useSWR } from "@/lib/swr";
import type { ActionResult } from "@/types/action-result";
import type {
  ContractProfitRow,
  FinanceContractListItem,
  LedgerItem,
  PaginatedResult,
} from "@/types/finance-dashboard";
import type {
  CashflowTimelinePoint,
  ReportFiltersInput,
  ReportPeriodType,
  ReportsSnapshot,
  ReportView,
} from "@/types/reports";

const ProfitReportTable = dynamic(
  () => import("@/components/finance/dashboard/profit-report-table").then((mod) => mod.ProfitReportTable),
  { ssr: false, loading: () => <SkeletonCard className="h-96" /> },
);

const ReportsCashflowView = dynamic(
  () => import("@/components/reports/reports-cashflow-view").then((mod) => mod.ReportsCashflowView),
  { ssr: false, loading: () => <SkeletonCard className="h-96" /> },
);

interface ReportsClientProps {
  initialFilters: ReportFiltersInput;
  initialSnapshot: ReportsSnapshot;
  initialDebtStats: DebtStats;
  initialCashflow: CashflowTimelinePoint[];
  initialLedger: PaginatedResult<LedgerItem>;
  initialPending: FinanceContractListItem[];
  initialProfit: PaginatedResult<ContractProfitRow>;
}

const EMPTY_LEDGER: PaginatedResult<LedgerItem> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 5,
};

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function ReportsClient({
  initialFilters,
  initialSnapshot,
  initialDebtStats,
  initialCashflow,
  initialLedger,
  initialPending,
  initialProfit,
}: ReportsClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [view, setView] = useState<ReportView>("overview");
  const [isExporting, setIsExporting] = useState(false);
  const { monthOptions, yearOptions } = useFinanceFilters(filters.year);

  const initialKey = useMemo(() => getReportPeriodKey(initialFilters), [initialFilters]);
  const periodKey = useMemo(() => getReportPeriodKey(filters), [filters]);
  const range = useMemo(() => getReportRange(filters), [filters]);
  const isInitialPeriod = periodKey === initialKey;

  const snapshot = useSWR(
    cacheKeys.reportsSnapshot(periodKey),
    () => requireData(getReportsSnapshot(filters)),
    isInitialPeriod ? { fallbackData: initialSnapshot, keepPreviousData: false } : { keepPreviousData: false },
  );

  const cashflow = useSWR(
    cacheKeys.financeCashflow(range.startDate, range.endDate),
    () => requireData(getCashflowTimeline(range.startDate, range.endDate)),
    isInitialPeriod ? { fallbackData: initialCashflow, keepPreviousData: false } : { keepPreviousData: false },
  );

  const ledger = useSWR(
    cacheKeys.reportsLedger(range.startDate, range.endDate),
    () => requireData(fetchLedger({ page: 1, pageSize: 5, fromDate: range.startDate, toDate: range.endDate, type: "all" })),
    isInitialPeriod ? { fallbackData: initialLedger, keepPreviousData: false } : { keepPreviousData: false },
  );

  const debtStats = useSWR(
    cacheKeys.debtStats(),
    () => requireData(fetchDebtStats()),
    { fallbackData: initialDebtStats, keepPreviousData: false },
  );

  const pending = useSWR(
    cacheKeys.financePending(),
    () => requireData(getPendingCollections(5)),
    { fallbackData: initialPending, keepPreviousData: false },
  );

  useEffect(() => {
    const firstError =
      snapshot.error ||
      cashflow.error ||
      ledger.error ||
      debtStats.error ||
      pending.error;

    if (firstError) {
      toast.error(firstError.message || "Không tải được báo cáo.");
    }
  }, [cashflow.error, debtStats.error, ledger.error, pending.error, snapshot.error]);

  const snapshotData = snapshot.data ?? (isInitialPeriod ? initialSnapshot : null);
  const cashflowData = cashflow.data ?? (isInitialPeriod ? initialCashflow : []);
  const ledgerData = ledger.data ?? (isInitialPeriod ? initialLedger : EMPTY_LEDGER);
  const debtData = debtStats.data ?? initialDebtStats;
  const pendingData = pending.data ?? initialPending;
  const isDebtView = view === "debts";

  const openLedger = () => router.push("/finance/cashflow");

  const handleExport = async () => {
    if (!snapshotData) return;

    try {
      setIsExporting(true);
      const result = await exportReportsWorkbook({
        filters,
        snapshot: snapshotData,
        debtStats: debtData,
        cashflow: cashflowData,
        pendingFallback: pendingData,
      });
      toast.success(`Đã xuất ${result.filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xuất được báo cáo.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePeriodTypeChange = (periodType: ReportPeriodType) => {
    setFilters((previous) => {
      const currentRange = getReportRange(previous);
      if (periodType === "custom") {
        return {
          periodType,
          year: previous.year,
          startDate: currentRange.startDate,
          endDate: currentRange.endDate,
        };
      }

      if (periodType === "quarter") {
        const nextQuarter = previous.quarter || Math.max(1, Math.ceil((previous.month || 1) / 3));
        return { periodType, year: previous.year, quarter: nextQuarter };
      }

      if (periodType === "year") {
        return { periodType, year: previous.year };
      }

      return { periodType, year: previous.year, month: previous.month || initialFilters.month || 1 };
    });
  };

  if (!snapshotData) {
    return (
      <div className="main-container gap-4!">
        <Breadcrumb items={[{ label: "Tài chính", href: "/finance" }, { label: "Báo cáo" }]} />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-96" />
      </div>
    );
  }

  return (
    <div className="main-container gap-4!">
      <Breadcrumb items={[{ label: "Tài chính", href: "/finance" }, { label: "Báo cáo" }]} />

      <section className="entrance entrance-0">
        <div className="card-base px-5 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              {isDebtView ? <DebtStatsBar stats={debtData} /> : <ReportsStatsBar summary={snapshotData.summary} />}
            </div>
            <div className="hidden shrink-0 lg:flex">
              <ReportsPageActions
                isExporting={isExporting}
                onExport={handleExport}
                onOpenLedger={openLedger}
              />
            </div>
            <div className="lg:hidden">
              <ReportsPageActions
                mobile
                isExporting={isExporting}
                onExport={handleExport}
                onOpenLedger={openLedger}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="entrance entrance-1">
        <ReportsFilters
          filters={filters}
          view={view}
          showPeriodControls={!isDebtView}
          monthOptions={monthOptions}
          yearOptions={yearOptions}
          onMonthChange={(value) => setFilters((previous) => ({ ...previous, month: Number(value) }))}
          onQuarterChange={(value) => setFilters((previous) => ({ ...previous, quarter: Number(value) }))}
          onYearChange={(value) => setFilters((previous) => ({ ...previous, year: Number(value) }))}
          onPeriodTypeChange={handlePeriodTypeChange}
          onStartDateChange={(value) =>
            value
              ? setFilters((previous) => ({
                  ...previous,
                  startDate: value,
                  endDate: previous.endDate && previous.endDate < value ? value : previous.endDate,
                  year: Number(value.slice(0, 4)) || previous.year,
                }))
              : undefined
          }
          onEndDateChange={(value) =>
            value
              ? setFilters((previous) => ({
                  ...previous,
                  endDate: value,
                  startDate: previous.startDate && previous.startDate > value ? value : previous.startDate,
                  year: Number(value.slice(0, 4)) || previous.year,
                }))
              : undefined
          }
          onViewChange={setView}
        />
      </section>

      <section className="entrance entrance-2 space-y-4">
        {view === "overview" && <ReportsOverviewView snapshot={snapshotData} />}

        {view === "cashflow" && (
          <ReportsCashflowView
            cashflow={cashflowData}
            ledgerItems={ledgerData.items}
            snapshot={snapshotData}
          />
        )}

        {view === "debts" && <ReportsDebtsView debtStats={debtData} pending={pendingData} />}

        {view === "profit" && (
          <>
            <div className="card-base flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-body-sm font-semibold text-text-primary">Bảng lợi nhuận mặc định theo kỳ đang xem</p>
                <p className="text-caption text-text-muted">
                  Bạn vẫn có thể lọc sâu hơn theo trạng thái và khoảng ngày cụ thể.
                </p>
              </div>
              <Badge variant="info">
                {snapshotData.range.startDate} đến {snapshotData.range.endDate}
              </Badge>
            </div>

            <ProfitReportTable
              key={`profit-${periodKey}`}
              initialData={isInitialPeriod ? initialProfit : undefined}
              initialFromDate={snapshotData.range.startDate}
              initialToDate={snapshotData.range.endDate}
            />
          </>
        )}
      </section>
    </div>
  );
}
