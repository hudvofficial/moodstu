import type { Role } from "./roles";
import type { Database } from "./database.types";

export type ServiceTypeEnum = Database["public"]["Enums"]["service_type_enum"];

export interface DashboardVisibility {
  canViewFinancials: boolean;
  canViewContracts: boolean;
  canViewCalendar: boolean;
}

export interface DashboardAccess {
  employeeId: string | null;
  role: Role;
  visibility: DashboardVisibility;
}

export interface DashboardKPIs {
  /** Doanh thu theo ngày CHỤP (ADR-016) — finance_pnl_by_month.revenue, không phải tiền thu */
  totalRevenue: number;
  revenueChange: number | null;

  /** Két: tiền vào theo ngày phiếu (payments + receipts lẻ) — finance_pnl_by_month.cash_in */
  cashIn: number;
  cashInChange: number | null;

  /** Lãi/lỗ tháng theo luật ngày ADR-016 — finance_pnl_by_month.profit */
  profit: number;
  profitChange: number | null;

  newContracts: number;
  contractsChange: number | null;

  totalDebt: number;
  debtChange: number | null;

  completedContracts: number;
  completedChange: number | null;
}

export interface DashboardPeriod {
  month: number;
  year: number;
  label: string;
}

export interface RevenueChartData {
  month: string;
  revenue: number;
}

export interface ServiceBreakdownData {
  name: string;
  serviceType: ServiceTypeEnum | "khac";
  value: number;
  count: number;
  revenue: number;
  fill: string;
}

export type UpcomingEventSource = "contract_events" | "schedules" | "work_tasks";

export interface UpcomingEventMilestone {
  id: string;
  eventDate: string;
  source: UpcomingEventSource;
  sourceLabel: string;
}

export interface UpcomingEventData {
  id: string;
  contractId: string | null;
  contractCode: string | null;
  customerName: string;
  eventDate: string;
  serviceType: ServiceTypeEnum | "khac";
  source: UpcomingEventSource;
  sourceLabel: string;
  href: string;
  milestones?: UpcomingEventMilestone[];
  eventCount?: number;
}

export type PaymentReminderSource = "payment_plans" | "contracts";

export interface PaymentReminderMilestone {
  id: string;
  stageName: string | null;
  amount: number;
  dueDate: string | null;
  source: PaymentReminderSource;
  isOverdue: boolean;
}

export interface PaymentReminderData {
  id: string;
  contractId: string;
  contractCode: string;
  customerName: string;
  stageName: string | null;
  remainingAmount: number;
  dueDate: string | null;
  source: PaymentReminderSource;
  isOverdue: boolean;
  href: string;
  milestones?: PaymentReminderMilestone[];
  installmentCount?: number;
  overdueCount?: number;
}

export interface DashboardBootstrapData {
  access: DashboardAccess;
  period: DashboardPeriod;
  kpis: DashboardKPIs;
  revenueChart: RevenueChartData[];
  serviceBreakdown: ServiceBreakdownData[];
  upcomingEvents: UpcomingEventData[];
  paymentReminders: PaymentReminderData[];
  errors: string[];
}

export interface DashboardCriticalData {
  access: DashboardAccess;
  period: DashboardPeriod;
  kpis: DashboardKPIs;
  errors: string[];
}

export interface DashboardSectionResult<T> {
  data: T;
  errors: string[];
}
