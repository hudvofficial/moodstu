import {
  getContractProfitReport,
  getDashboardMetrics,
  getPendingCollections,
  getRevenueByMonth,
  getServiceDistribution,
  getUpcomingContracts,
  fetchLedger,
} from "@/app/actions/finance-dashboard-queries";
import { FinanceDashboardClient } from "@/components/finance/dashboard/finance-dashboard-client";
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

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

const emptyMetrics: DashboardMetrics = {
  totalInflow: 0,
  totalOutflow: 0,
  profit: 0,
  monthChangePercent: 0,
  contractsNew: 0,
  contractsDone: 0,
  totalDebt: 0,
};

export const metadata = { title: "Tài chính | Mood Studio" };
export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [metrics, revenue, services, upcoming, pending, ledger, profit] = await Promise.all([
    getDashboardMetrics(month, year),
    getRevenueByMonth(year),
    getServiceDistribution(month, year),
    getUpcomingContracts(5),
    getPendingCollections(5),
    fetchLedger({ page: 1, pageSize: 5, month, year, type: "all" }),
    getContractProfitReport({ page: 1, pageSize: 8 }),
  ]);

  return (
    <FinanceDashboardClient
      initialMonth={month}
      initialYear={year}
      initialMetrics={unwrap(metrics, emptyMetrics)}
      initialRevenue={unwrap<RevenueByMonthItem[]>(revenue, [])}
      initialServices={unwrap<ServiceDistributionItem[]>(services, [])}
      initialUpcoming={unwrap<FinanceContractListItem[]>(upcoming, [])}
      initialPending={unwrap<FinanceContractListItem[]>(pending, [])}
      initialLedger={unwrap<PaginatedResult<LedgerItem>>(ledger, {
        items: [],
        total: 0,
        page: 1,
        pageSize: 5,
      })}
      initialProfit={unwrap<PaginatedResult<ContractProfitRow>>(profit, {
        items: [],
        total: 0,
        page: 1,
        pageSize: 8,
      })}
    />
  );
}
