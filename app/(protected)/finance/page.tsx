import {
  getFinanceDashboardBootstrap,
} from "@/app/actions/finance-dashboard-queries";
import { FinanceDashboardClient } from "@/components/finance/dashboard/finance-dashboard-client";
import type { DashboardMetrics } from "@/types/finance-dashboard";

export const metadata = { title: "Tài chính" };
export const dynamic = "force-dynamic";

const EMPTY_METRICS: DashboardMetrics = {
  totalInflow: 0,
  totalOutflow: 0,
  profit: 0,
  monthChangePercent: 0,
  contractsNew: 0,
  contractsDone: 0,
  totalDebt: 0,
};

export default async function FinanceDashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const bootstrap = await getFinanceDashboardBootstrap(month, year);
  const initialMetrics = bootstrap.success ? bootstrap.data.metrics : EMPTY_METRICS;

  return (
    <FinanceDashboardClient
      initialMonth={month}
      initialYear={year}
      initialMetrics={initialMetrics}
    />
  );
}

