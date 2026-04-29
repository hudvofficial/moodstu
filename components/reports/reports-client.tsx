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
import { getReportRange } from "@/lib/report-period";
import { cacheKeys, useSWR } from "@/lib/swr";
import type { ActionResult } from "@/types/action-result";
import type {
  FinanceContractListItem,
  LedgerItem,
  PaginatedResult,
} from "@/types/finance-dashboard";
import type {
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
}

const EMPTY_LEDGER: PaginatedResult<LedgerItem> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 5,
};

const EMPTY_DEBT_STATS: DebtStats = {
  receivable: 0,
  payable: 0,
  overdue: 0,
  net_debt: 0,
  aging: {
    not_due: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    over_90: 0,
  },
};

const EMPTY_PENDING: FinanceContractListItem[] = [];

function buildPeriodKey(range: ReportsSnapshot["range"]) {
  return [
    range.periodType,
    range.year,
    range.month || "all",
    range.quarter || "all",
    range.startDate,
    range.endDate,
  ].join(":");
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function ReportsClient({
  initialFilters,
  initialSnapshot,
}: ReportsClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [view, setView] = useState<ReportView>("overview");
  const [isExporting, setIsExporting] = useState(false);
  const { monthOptions, yearOptions } = useFinanceFilters(filters.year);

  const initialRange = useMemo(() => getReportRange(initialFilters), [initialFilters]);
  const initialKey = useMemo(() => buildPeriodKey(initialRange), [initialRange]);
  const filterState = useMemo(() => {
    try {
      const nextRange = getReportRange(filters);
      return {
        error: null as string | null,
        periodKey: buildPeriodKey(nextRange),
        range: nextRange,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Bo loc bao cao khong hop le.",
        periodKey: null,
        range: initialRange,
      };
    }
  }, [filters, initialRange]);
  const periodKey = filterState.periodKey ?? initialKey;
  const range = filterState.range;
  const hasFilterError = Boolean(filterState.error);
  const isInitialPeriod = periodKey === initialKey;

  const snapshot = useSWR(
    hasFilterError ? null : cacheKeys.reportsSnapshot(periodKey),
    () => requireData(getReportsSnapshot(filters)),
    isInitialPeriod
      ? { fallbackData: initialSnapshot, keepPreviousData: false, revalidateOnMount: false }
      : { keepPreviousData: false },
  );

  const cashflow = useSWR(
    view === "cashflow" && !hasFilterError ? cacheKeys.financeCashflow(range.startDate, range.endDate) : null,
    () => requireData(getCashflowTimeline(range.startDate, range.endDate)),
    { keepPreviousData: false },
  );

  const ledger = useSWR(
    view === "cashflow" && !hasFilterError ? cacheKeys.reportsLedger(range.startDate, range.endDate) : null,
    () => requireData(fetchLedger({ page: 1, pageSize: 5, fromDate: range.startDate, toDate: range.endDate, type: "all" })),
    { keepPreviousData: false },
  );

  const debtStats = useSWR(
    view === "debts" ? cacheKeys.debtStats() : null,
    () => requireData(fetchDebtStats()),
    { keepPreviousData: false },
  );

  const pending = useSWR(
    view === "debts" ? cacheKeys.financePending() : null,
    () => requireData(getPendingCollections(5)),
    { keepPreviousData: false },
  );

  useEffect(() => {
    if (filterState.error) {
      toast.error(filterState.error);
    }
  }, [filterState.error]);

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
  const cashflowData = cashflow.data ?? [];
  const ledgerData = ledger.data ?? EMPTY_LEDGER;
  const debtData = debtStats.data ?? EMPTY_DEBT_STATS;
  const pendingData = pending.data ?? EMPTY_PENDING;
  const isDebtView = view === "debts";
  const isCashflowView = view === "cashflow";
  const isCashflowLoading = isCashflowView && (!cashflow.data || !ledger.data) && !cashflow.error && !ledger.error;
  const isDebtsLoading = isDebtView && (!debtStats.data || !pending.data) && !debtStats.error && !pending.error;

  const openLedger = () => router.push("/finance/cashflow");

  const handleExport = async () => {
    if (!snapshotData) return;
    if (filterState.error) {
      toast.error(filterState.error);
      return;
    }

    try {
      setIsExporting(true);
      const [exportDebtStats, exportCashflow] = await Promise.all([
        debtStats.data ? Promise.resolve(debtStats.data) : requireData(fetchDebtStats()),
        cashflow.data
          ? Promise.resolve(cashflow.data)
          : requireData(getCashflowTimeline(snapshotData.range.startDate, snapshotData.range.endDate)),
      ]);

      const result = await exportReportsWorkbook({
        filters,
        snapshot: snapshotData,
        debtStats: exportDebtStats,
        cashflow: exportCashflow,
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

        {view === "cashflow" && isCashflowLoading && <SkeletonCard className="h-96" />}

        {view === "cashflow" && !isCashflowLoading && (
          <ReportsCashflowView
            cashflow={cashflowData}
            ledgerItems={ledgerData.items}
            snapshot={snapshotData}
          />
        )}

        {view === "debts" && isDebtsLoading && <SkeletonCard className="h-96" />}

        {view === "debts" && !isDebtsLoading && <ReportsDebtsView debtStats={debtData} pending={pendingData} />}

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
              initialFromDate={snapshotData.range.startDate}
              initialToDate={snapshotData.range.endDate}
            />
          </>
        )}
      </section>
    </div>
  );
}
