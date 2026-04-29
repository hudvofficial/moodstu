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
  totalRevenue: number;
  revenueChange: number | null;

  newContracts: number;
  contractsChange: number | null;

  totalDebt: number;
  debtChange: number | null;

  completedContracts: number;
  completedChange: number | null;
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

export interface UpcomingEventData {
  id: string;
  contractId: string | null;
  contractCode: string | null;
  customerName: string;
  eventDate: string;
  serviceType: ServiceTypeEnum | "khac";
  source: "contract_events" | "schedules" | "work_tasks";
  sourceLabel: string;
  href: string;
}

export interface PaymentReminderData {
  id: string;
  contractId: string;
  contractCode: string;
  customerName: string;
  stageName: string | null;
  remainingAmount: number;
  dueDate: string | null;
  source: "payment_plans" | "contracts";
  isOverdue: boolean;
  href: string;
}

export interface DashboardBootstrapData {
  access: DashboardAccess;
  period: {
    month: number;
    year: number;
    label: string;
  };
  kpis: DashboardKPIs;
  revenueChart: RevenueChartData[];
  serviceBreakdown: ServiceBreakdownData[];
  upcomingEvents: UpcomingEventData[];
  paymentReminders: PaymentReminderData[];
  errors: string[];
}
