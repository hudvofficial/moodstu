import {
  fetchLedger,
  getContractProfitReport,
  getPendingCollections,
} from "@/app/actions/finance-dashboard-queries";
import { getCashflowTimeline } from "@/app/actions/finance-cashflow-timeline";
import { getReportsSnapshot } from "@/app/actions/finance-reports-queries";
import { fetchDebtStats, type DebtStats } from "@/app/actions/finance-operations-queries";
import { ReportsClient } from "@/components/reports/reports-client";
import { getReportRange } from "@/lib/report-period";
import { getTodayInTimeZone } from "@/lib/studio-date";
import type { ActionResult } from "@/types/action-result";
import type {
  ContractProfitRow,
  FinanceContractListItem,
  LedgerItem,
  PaginatedResult,
} from "@/types/finance-dashboard";
import type { CashflowTimelinePoint, ReportFiltersInput, ReportsSnapshot } from "@/types/reports";

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

const emptySnapshot: ReportsSnapshot = {
  range: {
    periodType: "month",
    label: "Thang hien tai",
    startDate: "",
    endDate: "",
    year: new Date().getFullYear(),
    month: 1,
  },
  summary: {
    totalRevenue: 0,
    totalCost: 0,
    directCost: 0,
    operatingCost: 0,
    salaryCost: 0,
    fixedCost: 0,
    netProfit: 0,
    profitMargin: 0,
    totalContracts: 0,
    completedContracts: 0,
    avgContractValue: 0,
    totalDiscount: 0,
    packageRevenue: 0,
    addonRevenue: 0,
    addonCount: 0,
    addonPercentage: 0,
  },
  serviceDistribution: [],
  revenueBreakdown: [],
  cashflowSummary: {
    totalInflow: 0,
    totalOutflow: 0,
    salaryCost: 0,
    fixedCost: 0,
    operatingNet: 0,
    netAfterOverhead: 0,
  },
};

const emptyLedger: PaginatedResult<LedgerItem> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 5,
};

const emptyProfit: PaginatedResult<ContractProfitRow> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 8,
};

const emptyDebtStats: DebtStats = {
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

export const metadata = { title: "Báo cáo | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const today = getTodayInTimeZone();
  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const initialFilters: ReportFiltersInput = { periodType: "month", month, year };
  const range = getReportRange(initialFilters);

  const [snapshot, debtStats, cashflow, ledger, pending, profit] = await Promise.all([
    getReportsSnapshot(initialFilters),
    fetchDebtStats(),
    getCashflowTimeline(range.startDate, range.endDate),
    fetchLedger({ page: 1, pageSize: 5, fromDate: range.startDate, toDate: range.endDate, type: "all" }),
    getPendingCollections(5),
    getContractProfitReport({ page: 1, pageSize: 8, fromDate: range.startDate, toDate: range.endDate }),
  ]);

  return (
    <ReportsClient
      initialFilters={initialFilters}
      initialSnapshot={unwrap(snapshot, emptySnapshot)}
      initialDebtStats={unwrap(debtStats, emptyDebtStats)}
      initialCashflow={unwrap<CashflowTimelinePoint[]>(cashflow, [])}
      initialLedger={unwrap<PaginatedResult<LedgerItem>>(ledger, emptyLedger)}
      initialPending={unwrap<FinanceContractListItem[]>(pending, [])}
      initialProfit={unwrap<PaginatedResult<ContractProfitRow>>(profit, emptyProfit)}
    />
  );
}
