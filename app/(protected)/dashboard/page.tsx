import { Suspense } from "react";
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
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KPICard } from "@/components/ui/kpi-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import {
  getDashboardCritical,
  getDashboardPaymentRemindersSection,
  getDashboardRevenueChartSection,
  getDashboardServiceBreakdownSection,
  getDashboardUpcomingEventsSection,
  requireDashboardAccess,
} from "@/lib/api/dashboard";
import type { DashboardVisibility, DashboardKPIs } from "@/types/dashboard";
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

// --- SKELETONS ---
function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SkeletonCard className="h-[120px]" />
      <SkeletonCard className="h-[120px]" />
      <SkeletonCard className="h-[120px]" />
      <SkeletonCard className="h-[120px]" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5 card-base h-[400px]">
      <SkeletonCard className="h-6 w-1/3 mb-2" />
      <SkeletonCard className="h-16 w-full" />
      <SkeletonCard className="h-16 w-full" />
      <SkeletonCard className="h-16 w-full" />
      <SkeletonCard className="h-16 w-full" />
    </div>
  );
}

// --- UI HELPERS ---
function DashboardErrorBanner({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="card-base border-warning/30 bg-warning/8 p-4 text-body-sm text-text-primary mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="font-semibold">Một số dữ liệu chưa tải được.</p>
          <p className="mt-1 text-text-secondary">
            Chi tiết lỗi đã được ghi nhận. Vui lòng thử tải lại trang nếu cần.
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
      Đang dùng dữ liệu dự phòng do lỗi truy vấn.
    </div>
  );
}

function DashboardKpiGrid({ kpis, visibility }: { kpis: DashboardKPIs; visibility: DashboardVisibility }) {
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

// --- STREAMING SERVER COMPONENTS ---

async function KpiSection() {
  const critical = await getDashboardCritical();
  return (
    <>
      <DashboardErrorBanner errors={critical.errors} />
      <DashboardKpiGrid kpis={critical.kpis} visibility={critical.access.visibility} />
    </>
  );
}

async function RevenueSection({ visibility }: { visibility: DashboardVisibility }) {
  const result = await getDashboardRevenueChartSection();
  return (
    <>
      <SectionErrorNotice errors={result.errors} />
      <RevenueChart
        data={result.data}
        canView={visibility.canViewFinancials}
        periodLabel="6 tháng gần nhất"
      />
    </>
  );
}

async function ServiceBreakdownSection({ visibility }: { visibility: DashboardVisibility }) {
  const result = await getDashboardServiceBreakdownSection();
  return (
    <>
      <SectionErrorNotice errors={result.errors} />
      <ServicePieChart
        data={result.data}
        canView={visibility.canViewContracts}
        showRevenue={visibility.canViewFinancials}
      />
    </>
  );
}

async function EventsSection({ visibility }: { visibility: DashboardVisibility }) {
  const result = await getDashboardUpcomingEventsSection();
  return (
    <>
      <SectionErrorNotice errors={result.errors} />
      <UpcomingEventsList
        events={result.data}
        canView={visibility.canViewCalendar || visibility.canViewContracts}
      />
    </>
  );
}

async function PaymentsSection({ visibility }: { visibility: DashboardVisibility }) {
  const result = await getDashboardPaymentRemindersSection();
  return (
    <>
      <SectionErrorNotice errors={result.errors} />
      <PaymentReminders
        reminders={result.data}
        canView={visibility.canViewFinancials}
      />
    </>
  );
}

// --- MAIN PAGE (THIN SHELL) ---

export default async function DashboardPage() {
  // ⚡ LOẠI BỎ CHẶN LUỒNG: Auth check chạy trong 0ms (Cache cookie). Không gọi DB ở đây.
  const access = await requireDashboardAccess();
  const { visibility, role } = access;

  const now = new Date();
  const periodLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

  return (
    <div className="main-container">
      <DashboardRealtimeRefresh visibility={visibility} />

      <DashboardHeader periodLabel={periodLabel} />

      <QuickAccessGrid role={role} />

      <Suspense fallback={<KpiSkeleton />}>
        <KpiSection />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 mt-4">
        <div className="lg:col-span-3">
          <Suspense fallback={<ChartSkeleton height={400} />}>
            <RevenueSection visibility={visibility} />
          </Suspense>
        </div>

        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton height={400} />}>
            <ServiceBreakdownSection visibility={visibility} />
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
        <div>
          <Suspense fallback={<ListSkeleton />}>
            <EventsSection visibility={visibility} />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<ListSkeleton />}>
            <PaymentsSection visibility={visibility} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
