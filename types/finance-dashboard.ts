/**
 * ADR-016 M2 — ba khối của một tháng (finance_month_summary):
 * cash = KÉT (tiền thật theo ngày phiếu) · pnl = LÃI/LỖ (doanh thu theo ngày chụp, chi phí cam kết theo
 * ngày nghiệp vụ) · debt = CÔNG NỢ hiện tại (phải thu / phải trả). Không trộn ba số này với nhau.
 */
export interface MonthSummary {
  month: number;
  year: number;
  cash: {
    in: number;
    inContract: number;
    inRetail: number;
    out: number;
    outSettlement: number;
    outOther: number;
    net: number;
    netPrev: number;
  };
  pnl: {
    revenue: number;
    revenueContract: number;
    revenueRetail: number;
    cost: number;
    costTask: number;
    costPrint: number;
    costCogs: number;
    costDirect: number;
    costOverhead: number;
    costSalaryBase: number;
    profit: number;
    profitPrev: number;
    margin: number;
    contractsShot: number;
    contractsMissingWorkDate: number;
  };
  debt: {
    receivable: number;
    payable: number;
    payableLab: number;
    payableVendor: number;
    payableSupplier: number;
  };
}

/** finance_pnl_by_month — 12 tháng: doanh thu/chi phí/lãi theo luật ngày + tiền thu/chi theo ngày phiếu */
export interface RevenueByMonthItem {
  month: string;
  rawMonth: number;
  revenue: number;
  cost: number;
  profit: number;
  cashIn: number;
  cashOut: number;
  signedRevenue: number;
}

export interface ServiceDistributionItem {
  name: string;
  value: number;
  revenue: number;
}

export interface FinanceContractListItem {
  id: string;
  contract_code: string | null;
  work_date?: string | null;
  contract_date?: string | null;
  status: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  remaining_amount?: number | null;
  customers?: { id: string; full_name: string; phone: string | null } | null;
}

export interface ContractProfitReportParams {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ContractProfitRow {
  id: string;
  contractCode: string;
  customerName: string;
  contractDate: string | null;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  packageRevenue: number;
  addonRevenue: number;
  discount: number;
  taskCost: number;
  printCost: number;
  expenseCost: number;
  inventoryCost: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

export interface LedgerItem {
  id: string;
  sourceTable: "payments" | "receipts" | "expenses";
  direction: "in" | "out";
  transactionDate: string;
  amount: number;
  code: string;
  customerName: string;
  categoryName: string;
  paymentMethod: string;
  description: string;
  status: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FinanceDashboardBootstrapData {
  metrics: MonthSummary;
  revenue: RevenueByMonthItem[];
  services: ServiceDistributionItem[];
  upcoming: FinanceContractListItem[];
  pending: FinanceContractListItem[];
  ledger: PaginatedResult<LedgerItem>;
  profit: PaginatedResult<ContractProfitRow>;
}

// Drawer Interfaces
export interface ContractDetail {
  id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  item_type?: string | null;
  addon_category?: string | null;
  status?: string;
}

export interface PersonalTask {
  id: string;
  work_type: string;
  cost: number;
  employees: {
    full_name: string;
  } | null;
}

export interface ProductionOrder {
  id: string;
  item_name: string;
  quantity: number;
  cost: number;
  payment_status: string;
}

export interface OperationalExpense {
  id: string;
  description?: string;
  amount: number;
  transaction_date?: string;
}

export interface InventoryCostItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  source_type?: string | null;
  transaction_date?: string;
}

export interface ContractProfitDetailData {
  contract: {
    id: string;
    total_amount: number;
    discount: number;
    subtotal: number;
    contract_code: string;
    status: string;
    created_at: string;
    customer_name: string;
  };
  details: ContractDetail[];
  tasks: PersonalTask[];
  orders: ProductionOrder[];
  expenses: OperationalExpense[];
  inventory: InventoryCostItem[];
}
