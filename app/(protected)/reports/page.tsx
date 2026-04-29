import { getReportsSnapshot } from "@/app/actions/finance-reports-queries";
import { ReportsClient } from "@/components/reports/reports-client";
import { getTodayInTimeZone } from "@/lib/studio-date";
import type { ActionResult } from "@/types/action-result";
import type { ReportFiltersInput } from "@/types/reports";

function requireInitialData<T>(result: ActionResult<T>): T {
  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}

export const metadata = { title: "Báo cáo" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const today = getTodayInTimeZone();
  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const initialFilters: ReportFiltersInput = { periodType: "month", month, year };
  const snapshot = await getReportsSnapshot(initialFilters);

  return (
    <ReportsClient
      initialFilters={initialFilters}
      initialSnapshot={requireInitialData(snapshot)}
    />
  );
}

