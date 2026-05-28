import { ReportsClient } from "@/components/reports/reports-client";
import { getTodayInTimeZone } from "@/lib/studio-date";
import type { ReportFiltersInput } from "@/types/reports";

export const metadata = { title: "Báo cáo" };
export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const today = getTodayInTimeZone();
  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const initialFilters: ReportFiltersInput = { periodType: "month", month, year };

  // 0ms navigation: we skip Server-blocking database queries here.
  // We just calculate the default period and render the client shell.
  // SWR will handle the fetching while showing a beautiful skeleton UI.
  return (
    <ReportsClient
      initialFilters={initialFilters}
    />
  );
}
