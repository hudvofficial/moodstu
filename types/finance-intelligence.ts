export interface FinanceHealthBreakdownItem {
  score: number;
  label: string;
}

export interface FinanceIntelligenceResult {
  health_score: number;
  health_status: 'CRITICAL' | 'WARNING' | 'STABLE' | 'EXCELLENT';
  health_message: string;
  breakdown: {
    profitability: FinanceHealthBreakdownItem;
    breakeven: FinanceHealthBreakdownItem;
    runway: FinanceHealthBreakdownItem;
    receivables: FinanceHealthBreakdownItem;
    cashflow: FinanceHealthBreakdownItem;
  };
  cashflow: {
    currentCash: number;
    burnRate: number;
    runwayMonths: number;
    projectedBalance: number;
    lowCashWarning: boolean;
  };
  breakeven: {
    target: number;
    current: number;
    percent: number;
    remainingAmount: number;
  };
  stats: {
    monthlyRevenue: number;
    monthlyExpense: number;
    monthlyProfit: number;
    receivables: number;
    payables: number;
    prevRevenue: number;
    prevExpense: number;
  };
}

export interface CashflowEvent {
  title: string;
  amount: number;
  type: 'IN' | 'OUT';
}

export interface CashflowForecastDay {
  date: string;
  projectedIncome: number;
  projectedExpense: number;
  balance: number;
  events: CashflowEvent[];
}

export interface CashflowForecastResult {
  currentBalance: number;
  monthlyBurnRate: number;
  forecast30Days: CashflowForecastDay[];
  summary: {
    projectedInflow: number;
    projectedOutflow: number;
    netChange: number;
    criticalDate: string | null;
  };
}

export interface ExpenseBreakdownItem {
  category_name: string;
  total: number;
  percentage: number;
  count: number;
}

export interface ReceivableAgingBucket {
  total: number;
  count: number;
}

export interface ReceivableAgingResult {
  '0_30': ReceivableAgingBucket;
  '31_60': ReceivableAgingBucket;
  '61_90': ReceivableAgingBucket;
  '90_plus': ReceivableAgingBucket;
}

export interface BudgetVsActualItem {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variance_pct: number;
}

export interface ScenarioProjection {
  label: string;
  type: 'conservative' | 'base' | 'aggressive';
  nextMonthRevenue: number;
  nextMonthProfit: number;
  threeMonthRevenue: number;
  threeMonthProfit: number;
  description: string;
}

export interface CustomerMetrics {
  totalCustomers: number;
  avgContractValue: number;
  repeatCustomerRate: number;
  estimatedCLV: number;
  conversionRate: number;
  totalLeads: number;
  wonLeads: number;
}

export interface RevenueBreakdownItem {
  service_type: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DressRoiItem {
  id: string;
  name: string;
  code: string;
  purchasePrice: number;
  totalRentals: number;
  totalRevenue: number;
  roi: number;
}

export interface InventoryCostItem {
  category: string;
  thisMonth: number;
  lastMonth: number;
  change: number;
}

export interface AdvancedKpis {
  conversionRate: number;
  avgOrderValue: number;
  inventoryTurnover: number;
  cac: number;
  totalLeads: number;
  totalContracts: number;
  totalDresses: number;
  totalRentals: number;
}

export interface FinanceAdvancedIntelligenceResult {
  scenarios: ScenarioProjection[];
  customerMetrics: CustomerMetrics;
  revenueBreakdown: RevenueBreakdownItem[];
  dressROI: DressRoiItem[];
  inventoryCosts: InventoryCostItem[];
  advancedKPIs: AdvancedKpis;
}
