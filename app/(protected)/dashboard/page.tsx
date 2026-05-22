// Removed Suspense - using parallel Promise.all() instead for better performance
import {
  AlertTriangle,
  CheckCircle,
  DollarSign,
  FileText,
} from "lucide-react";
import { PaymentReminders } from "@/components/dashboard/payment-reminders";
import { QuickAccessGrid } from "@/components/dashboard/quick-access-grid";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ServicePieChart } from "@/components/dashboard/service-pie-chart";
import { UpcomingEventsList } from "@/components/dashboard/upcoming-events";
import { DashboardRealtimeRefresh } from "@/components/dashboard/dashboard-realtime-refresh";
import { KPICard } from "@/components/ui/kpi-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  getDashboardCritical,
  getDashboardPaymentRemindersSection,
  getDashboardRevenueChartSection,
  getDashboardServiceBreakdownSection,
  getDashboardUpcomingEventsSection,
} from "@/lib/api/dashboard";
import { formatVnd } from "@/lib/utils";
import type { DashboardKPIs, DashboardVisibility } from "@/types/dashboard";

export const metadata = { title: "Tổng quan" };
export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return formatVnd(value);
}

function formatTrend(value: number | null) {
  if (value === null) return undefined;
  return `${Math.abs(value).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function DashboardErrorBanner({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="card-base border-warning/30 bg-warning/8 p-4 text-body-sm text-text-primary">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="font-semibold">Một số dữ liệu dashboard chưa tải được.</p>
          <p className="mt-1 text-text-secondary">
            Dashboard đang hiển thị phần dữ liệu tải thành công. Chi tiết lỗi đã được giữ lại để xử lý.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionErrorNotice({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="mb-3 rounded-md border border-warning/25 bg-warning/8 px-3 py-2 text-caption text-text-secondary">
      Phần này đang dùng dữ liệu dự phòng do truy vấn chưa hoàn tất.
    </div>
  );
}

function DashboardKpiGrid({
  kpis,
  visibility,
}: {
  kpis: DashboardKPIs;
  visibility: DashboardVisibility;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        label="Doanh thu tháng"
        value={visibility.canViewFinancials ? formatMoney(kpis.totalRevenue) : "Ẩn"}
        icon={DollarSign}
        iconBg="bg-primary/10"
        iconColor="text-primary"
        trend={visibility.canViewFinancials ? formatTrend(kpis.revenueChange) : undefined}
        trendUp={(kpis.revenueChange ?? 0) >= 0}
        href={visibility.canViewFinancials ? "/finance" : undefined}
        className="entrance entrance-1"
      />
      <KPICard
        label="Hợp đồng mới"
        value={visibility.canViewContracts ? String(kpis.newContracts) : "Ẩn"}
        icon={FileText}
        iconBg="bg-info/10"
        iconColor="text-info"
        trend={visibility.canViewContracts ? formatTrend(kpis.contractsChange) : undefined}
        trendUp={(kpis.contractsChange ?? 0) >= 0}
        href={visibility.canViewContracts ? "/contracts" : undefined}
        className="entrance entrance-2"
      />
      <KPICard
        label="Tổng công nợ"
        value={visibility.canViewFinancials ? formatMoney(kpis.totalDebt) : "Ẩn"}
        icon={AlertTriangle}
        iconBg="bg-warning/10"
        iconColor="text-warning"
        trend={visibility.canViewFinancials ? formatTrend(kpis.debtChange) : undefined}
        trendUp={(kpis.debtChange ?? 0) >= 0}
        href={visibility.canViewFinancials ? "/finance" : undefined}
        className="entrance entrance-3"
      />
      <KPICard
        label="Hoàn thành"
        value={visibility.canViewContracts ? String(kpis.completedContracts) : "Ẩn"}
        icon={CheckCircle}
        iconBg="bg-success/10"
        iconColor="text-success"
        trend={visibility.canViewContracts ? formatTrend(kpis.completedChange) : undefined}
        trendUp={(kpis.completedChange ?? 0) >= 0}
        href={visibility.canViewContracts ? "/contracts?status=hoan_thanh" : undefined}
        className="entrance entrance-4"
      />
    </div>
  );
}

export default async function DashboardPage() {
  // Fetch critical data first
  const critical = await getDashboardCritical();
  const { visibility } = critical.access;

  // Parallel fetch all sections (eliminates waterfall!)
  const [revenueResult, serviceResult, eventsResult, paymentsResult] = await Promise.all([
    getDashboardRevenueChartSection(),
    getDashboardServiceBreakdownSection(),
    getDashboardUpcomingEventsSection(),
    getDashboardPaymentRemindersSection(),
  ]);

  return (
    <div className="main-container">
      <DashboardRealtimeRefresh />

      <QuickAccessGrid role={critical.access.role} />
      <DashboardErrorBanner errors={critical.errors} />
      <DashboardKpiGrid kpis={critical.kpis} visibility={visibility} />

      {/* Revenue Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionErrorNotice errors={revenueResult.errors} />
          <RevenueChart
            data={revenueResult.data}
            canView={visibility.canViewFinancials}
            periodLabel="6 tháng gần nhất"
          />
        </div>

        {/* Service Breakdown */}
        <div className="lg:col-span-2">
          <SectionErrorNotice errors={serviceResult.errors} />
          <ServicePieChart
            data={serviceResult.data}
            canView={visibility.canViewContracts}
            showRevenue={visibility.canViewFinancials}
          />
        </div>
      </div>

      {/* Events & Payments */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionErrorNotice errors={eventsResult.errors} />
          <UpcomingEventsList
            events={eventsResult.data}
            canView={visibility.canViewCalendar || visibility.canViewContracts}
          />
        </div>

        <div>
          <SectionErrorNotice errors={paymentsResult.errors} />
          <PaymentReminders
            reminders={paymentsResult.data}
            canView={visibility.canViewFinancials}
          />
        </div>
      </div>
    </div>
  );
}
