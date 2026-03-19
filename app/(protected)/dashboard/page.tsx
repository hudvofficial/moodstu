import {
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ServicePieChart } from "@/components/dashboard/service-pie-chart";
import { UpcomingEventsList } from "@/components/dashboard/upcoming-events";
import { PaymentReminders } from "@/components/dashboard/payment-reminders";
import { QuickAccessGrid } from "@/components/dashboard/quick-access-grid";

export default function DashboardPage() {
  return (
    <div className="main-container">
      {/* ── Quick Access Grid (mobile only) ── */}
      <QuickAccessGrid />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Doanh thu tháng"
          value="45.500.000 ₫"
          icon={DollarSign}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          trend="12%"
          trendUp
          className="entrance entrance-1"
        />
        <KPICard
          label="Hợp đồng mới"
          value="12"
          icon={FileText}
          iconBg="bg-info/10"
          iconColor="text-info"
          trend="8%"
          trendUp
          className="entrance entrance-2"
        />
        <KPICard
          label="Tổng công nợ"
          value="23.200.000 ₫"
          icon={AlertTriangle}
          iconBg="bg-warning/10"
          iconColor="text-warning"
          trend="5%"
          trendUp={false}
          className="entrance entrance-3"
        />
        <KPICard
          label="Hoàn thành"
          value="8"
          icon={CheckCircle}
          iconBg="bg-success/10"
          iconColor="text-success"
          trend="15%"
          trendUp
          className="entrance entrance-4"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RevenueChart />
        </div>
        <div className="lg:col-span-2">
          <ServicePieChart />
        </div>
      </div>

      {/* ── Lists Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingEventsList />
        <PaymentReminders />
      </div>
    </div>
  );
}
