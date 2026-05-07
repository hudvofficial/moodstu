import type { ServiceDistributionItem } from "@/types/finance-dashboard";

export interface CashflowTimelinePoint {
  date: string;
  inflow: number;
  outflow: number;
}

export type ReportView = "overview" | "cashflow" | "debts" | "profit";
export type ReportPeriodType = "month" | "quarter" | "year" | "custom";

export interface ReportFiltersInput {
  periodType: ReportPeriodType;
  year: number;
  month?: number;
  quarter?: number;
  startDate?: string;
  endDate?: string;
}

export interface ReportRange {
  periodType: ReportPeriodType;
  label: string;
  startDate: string;
  endDate: string;
  year: number;
  month?: number;
  quarter?: number;
}

export interface ReportRevenueBreakdownItem {
  label: string;
  amount: number;
  percentage: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalCost: number;
  directCost: number;
  inventoryCost: number;
  operatingCost: number;
  salaryCost: number;
  fixedCost: number;
  netProfit: number;
  profitMargin: number;
  totalContracts: number;
  completedContracts: number;
  avgContractValue: number;
  totalDiscount: number;
  packageRevenue: number;
  addonRevenue: number;
  addonCount: number;
  addonPercentage: number;
}

export interface ReportCashflowSummary {
  totalInflow: number;
  totalOutflow: number;
  salaryCost: number;
  fixedCost: number;
  operatingNet: number;
  netAfterOverhead: number;
}

export interface ReportsSnapshot {
  range: ReportRange;
  summary: ReportSummary;
  serviceDistribution: ServiceDistributionItem[];
  revenueBreakdown: ReportRevenueBreakdownItem[];
  cashflowSummary: ReportCashflowSummary;
}
