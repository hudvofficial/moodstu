import type { 
  FinanceIntelligenceResult, 
  CashflowForecastResult, 
  ExpenseBreakdownItem, 
  ReceivableAgingResult, 
  BudgetVsActualItem 
} from "@/types/finance-intelligence";
import type {
  DashboardMetrics,
  RevenueByMonthItem,
  ServiceDistributionItem,
  ContractProfitRow,
  FinanceContractListItem
} from "@/types/finance-dashboard";

export const MOCK_FINANCE_INTELLIGENCE: FinanceIntelligenceResult = {
  health_score: 85,
  health_status: 'STABLE',
  health_message: 'Dòng tiền ổn định, công nợ trong tầm kiểm soát.',
  breakdown: {
    profitability: { score: 90, label: 'Lợi nhuận gộp đạt 65%' },
    breakeven: { score: 80, label: 'Vượt điểm hòa vốn tháng' },
    runway: { score: 85, label: 'Runway 8 tháng' },
    receivables: { score: 70, label: 'Tỷ lệ thu hồi 85%' },
    cashflow: { score: 95, label: 'Thặng dư tiền mặt' }
  },
  cashflow: {
    currentCash: 560000000,
    burnRate: 85000000,
    runwayMonths: 6.5,
    projectedBalance: 620000000,
    lowCashWarning: false
  },
  breakeven: {
    target: 200000000,
    current: 250000000,
    percent: 125,
    remainingAmount: 0
  },
  stats: {
    monthlyRevenue: 350000000,
    monthlyExpense: 120000000,
    monthlyProfit: 230000000,
    receivables: 45000000,
    payables: 25000000,
    prevRevenue: 310000000,
    prevExpense: 110000000
  }
};

export const MOCK_CASHFLOW_FORECAST: CashflowForecastResult = {
  currentBalance: 560000000,
  monthlyBurnRate: 85000000,
  forecast30Days: Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Randomize some income and expense events
    const income = Math.random() > 0.7 ? Math.random() * 50000000 : 0;
    const expense = Math.random() > 0.8 ? Math.random() * 20000000 : 0;
    
    return {
      date: dateStr,
      projectedIncome: income,
      projectedExpense: expense,
      balance: 560000000 + (income - expense) * (i + 1), // simplified progression
      events: []
    };
  }),
  summary: {
    projectedInflow: 450000000,
    projectedOutflow: 120000000,
    netChange: 330000000,
    criticalDate: null
  }
};

export const MOCK_EXPENSE_BREAKDOWN: ExpenseBreakdownItem[] = [
  { category_name: "Lương & Thưởng", total: 65000000, percentage: 54.1, count: 12 },
  { category_name: "Chi phí Freelancer", total: 25000000, percentage: 20.8, count: 5 },
  { category_name: "Marketing", total: 15000000, percentage: 12.5, count: 3 },
  { category_name: "Mặt bằng & Điện nước", total: 10000000, percentage: 8.3, count: 2 },
  { category_name: "Khác", total: 5000000, percentage: 4.3, count: 8 },
];

export const MOCK_RECEIVABLE_AGING: ReceivableAgingResult = {
  '0_30': { total: 35000000, count: 8 },
  '31_60': { total: 8000000, count: 2 },
  '61_90': { total: 2000000, count: 1 },
  '90_plus': { total: 0, count: 0 }
};

export const MOCK_BUDGET_VS_ACTUAL: BudgetVsActualItem[] = [
  { category: "Lương quỹ", budget: 70000000, actual: 65000000, variance: 5000000, variance_pct: -7.1 },
  { category: "Marketing", budget: 10000000, actual: 15000000, variance: -5000000, variance_pct: 50 },
  { category: "Mặt bằng", budget: 10000000, actual: 10000000, variance: 0, variance_pct: 0 },
];

export const MOCK_DASHBOARD_METRICS: DashboardMetrics = {
  totalInflow: 350000000,
  totalOutflow: 120000000,
  profit: 230000000,
  monthChangePercent: 12.5,
  contractsNew: 24,
  contractsDone: 18,
  totalDebt: 45000000
};

export const MOCK_REVENUE_CHART: RevenueByMonthItem[] = [
  { month: "T1", revenue: 200000000, rawMonth: 1 },
  { month: "T2", revenue: 180000000, rawMonth: 2 },
  { month: "T3", revenue: 310000000, rawMonth: 3 },
  { month: "T4", revenue: 350000000, rawMonth: 4 },
  { month: "T5", revenue: 0, rawMonth: 5 },
  { month: "T6", revenue: 0, rawMonth: 6 },
  { month: "T7", revenue: 0, rawMonth: 7 },
  { month: "T8", revenue: 0, rawMonth: 8 },
  { month: "T9", revenue: 0, rawMonth: 9 },
  { month: "T10", revenue: 0, rawMonth: 10 },
  { month: "T11", revenue: 0, rawMonth: 11 },
  { month: "T12", revenue: 0, rawMonth: 12 },
];

export const MOCK_SERVICE_DIST: ServiceDistributionItem[] = [
  { name: "Chụp Pre-wedding", revenue: 150000000, value: 35 },
  { name: "Trọn gói Ngày Cưới", revenue: 120000000, value: 40 },
  { name: "Thuê Váy Cưới", revenue: 50000000, value: 15 },
  { name: "Makeup", revenue: 30000000, value: 10 },
];

export const MOCK_CONTRACT_PROFIT: ContractProfitRow[] = [
  {
    id: "idx-1",
    contractCode: "HD-2026-04-001",
    customerName: "Nguyễn Văn A & Trần Thị B",
    contractDate: "2026-04-01",
    packageRevenue: 40000000,
    addonRevenue: 5000000,
    discount: 0,
    totalAmount: 45000000,
    paidAmount: 45000000,
    remainingAmount: 0,
    taskCost: 5000000,
    printCost: 5000000,
    expenseCost: 5000000,
    totalCost: 15000000,
    profit: 30000000,
    profitMargin: 66.6,
    status: "hoan_thanh",
  },
  {
    id: "idx-2",
    contractCode: "HD-2026-04-002",
    customerName: "Lê Hoàng C",
    contractDate: "2026-04-05",
    packageRevenue: 50000000,
    addonRevenue: 15000000,
    discount: 0,
    totalAmount: 65000000,
    paidAmount: 30000000,
    remainingAmount: 35000000,
    taskCost: 10000000,
    printCost: 5000000,
    expenseCost: 5000000,
    totalCost: 20000000,
    profit: 45000000,
    profitMargin: 69.2,
    status: "dang_thuc_hien",
  },
  {
    id: "idx-3",
    contractCode: "HD-2026-04-003",
    customerName: "Phạm Minh D",
    contractDate: "2026-04-10",
    packageRevenue: 28000000,
    addonRevenue: 1000000,
    discount: 4000000,
    totalAmount: 25000000,
    paidAmount: 10000000,
    remainingAmount: 15000000,
    taskCost: 4000000,
    printCost: 2000000,
    expenseCost: 2000000,
    totalCost: 8000000,
    profit: 17000000,
    profitMargin: 68.0,
    status: "cho_xu_ly",
  }
];

export const MOCK_UPCOMING_CONTRACTS: FinanceContractListItem[] = [
  {
    id: "cx-1",
    contract_code: "HD-2026-04-15",
    work_date: "2026-04-20",
    contract_date: "2026-04-01",
    status: "dang_thuc_hien",
    total_amount: 55000000,
    paid_amount: 20000000,
    remaining_amount: 35000000,
    customers: { id: "c-1", full_name: "Hoàng Oanh", phone: "0901234567" }
  },
  {
    id: "cx-2",
    contract_code: "HD-2026-04-18",
    work_date: "2026-04-22",
    contract_date: "2026-04-05",
    status: "dang_thuc_hien",
    total_amount: 32000000,
    paid_amount: 10000000,
    remaining_amount: 22000000,
    customers: { id: "c-2", full_name: "Thanh Tùng", phone: "0987654321" }
  }
];

export const MOCK_PENDING_COLLECTIONS: FinanceContractListItem[] = [
  {
    id: "pc-1",
    contract_code: "HD-2026-03-22",
    work_date: "2026-03-25",
    contract_date: "2026-03-10",
    status: "cho_xu_ly",
    total_amount: 120000000,
    paid_amount: 50000000,
    remaining_amount: 70000000,
    customers: { id: "c-3", full_name: "Đình Trọng", phone: "0911223344" }
  },
  {
    id: "pc-2",
    contract_code: "HD-2026-04-02",
    work_date: "2026-04-10",
    contract_date: "2026-04-02",
    status: "dang_thuc_hien",
    total_amount: 45000000,
    paid_amount: 5000000,
    remaining_amount: 40000000,
    customers: { id: "c-4", full_name: "Trần Mai", phone: "0911223355" }
  }
];

import type { LedgerItem, PaginatedResult } from "@/types/finance-dashboard";
export const MOCK_LEDGER: PaginatedResult<LedgerItem> = {
  items: [
    {
      id: "lg-1",
      sourceTable: "payments",
      direction: "out",
      transactionDate: "2026-04-13T10:30:00",
      amount: 1500000,
      code: "PAY-2026-001",
      customerName: "-",
      categoryName: "Mua thiết bị",
      paymentMethod: "chuyen_khoan",
      description: "Thanh toán ngàm ống kính",
      status: "hoan_thanh"
    },
    {
      id: "lg-2",
      sourceTable: "receipts",
      direction: "in",
      transactionDate: "2026-04-12T15:20:00",
      amount: 25000000,
      code: "REC-2026-042",
      customerName: "Đình Trọng",
      categoryName: "Thu hợp đồng",
      paymentMethod: "tien_mat",
      description: "Cọc 50%",
      status: "hoan_thanh"
    },
    {
      id: "lg-3",
      sourceTable: "expenses",
      direction: "out",
      transactionDate: "2026-04-12T09:00:00",
      amount: 5000000,
      code: "EXP-2026-081",
      customerName: "-",
      categoryName: "Marketing",
      paymentMethod: "chuyen_khoan",
      description: "Chạy Ads Facebook",
      status: "pending"
    }
  ],
  total: 3,
  page: 1,
  pageSize: 5
};
