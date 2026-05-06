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
import { DashboardWarmup } from "@/components/dashboard/dashboard-warmup";
import { RealtimeSync } from "@/components/shared/realtime-sync";
import { KPICard } from "@/components/ui/kpi-card";
import { getDashboardBootstrap } from "@/lib/api/dashboard";
import { formatVnd } from "@/lib/utils";

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

export default async function DashboardPage() {
  const data = await getDashboardBootstrap();
  const { visibility } = data.access;

  return (
    <div className="main-container">
      <DashboardWarmup />
      <RealtimeSync table="contracts" debounceMs={500} />
      <RealtimeSync table="payments" debounceMs={500} />
      <RealtimeSync table="receipts" debounceMs={500} />
      <RealtimeSync table="payment_plans" debounceMs={500} />
      <RealtimeSync table="contract_events" debounceMs={500} />
      <RealtimeSync table="schedules" debounceMs={500} />
      <RealtimeSync table="work_tasks" debounceMs={500} />

      <QuickAccessGrid role={data.access.role} />
      <DashboardErrorBanner errors={data.errors} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Doanh thu tháng"
          value={visibility.canViewFinancials ? formatMoney(data.kpis.totalRevenue) : "Ẩn"}
          icon={DollarSign}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          trend={visibility.canViewFinancials ? formatTrend(data.kpis.revenueChange) : undefined}
          trendUp={(data.kpis.revenueChange ?? 0) >= 0}
          href={visibility.canViewFinancials ? "/finance" : undefined}
          className="entrance entrance-1"
        />
        <KPICard
          label="Hợp đồng mới"
          value={visibility.canViewContracts ? String(data.kpis.newContracts) : "Ẩn"}
          icon={FileText}
          iconBg="bg-info/10"
          iconColor="text-info"
          trend={visibility.canViewContracts ? formatTrend(data.kpis.contractsChange) : undefined}
          trendUp={(data.kpis.contractsChange ?? 0) >= 0}
          href={visibility.canViewContracts ? "/contracts" : undefined}
          className="entrance entrance-2"
        />
        <KPICard
          label="Tổng công nợ"
          value={visibility.canViewFinancials ? formatMoney(data.kpis.totalDebt) : "Ẩn"}
          icon={AlertTriangle}
          iconBg="bg-warning/10"
          iconColor="text-warning"
          trend={visibility.canViewFinancials ? formatTrend(data.kpis.debtChange) : undefined}
          trendUp={(data.kpis.debtChange ?? 0) >= 0}
          href={visibility.canViewFinancials ? "/finance" : undefined}
          className="entrance entrance-3"
        />
        <KPICard
          label="Hoàn thành"
          value={visibility.canViewContracts ? String(data.kpis.completedContracts) : "Ẩn"}
          icon={CheckCircle}
          iconBg="bg-success/10"
          iconColor="text-success"
          trend={visibility.canViewContracts ? formatTrend(data.kpis.completedChange) : undefined}
          trendUp={(data.kpis.completedChange ?? 0) >= 0}
          href={visibility.canViewContracts ? "/contracts?status=hoan_thanh" : undefined}
          className="entrance entrance-4"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart
            data={data.revenueChart}
            canView={visibility.canViewFinancials}
            periodLabel="6 tháng gần nhất"
          />
        </div>
        <div className="lg:col-span-2">
          <ServicePieChart
            data={data.serviceBreakdown}
            canView={visibility.canViewContracts}
            showRevenue={visibility.canViewFinancials}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingEventsList
          events={data.upcomingEvents}
          canView={visibility.canViewCalendar || visibility.canViewContracts}
        />
        <PaymentReminders
          reminders={data.paymentReminders}
          canView={visibility.canViewFinancials}
        />
      </div>
    </div>
  );
}
