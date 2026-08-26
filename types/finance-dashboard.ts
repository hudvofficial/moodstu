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
    /** Đã giao sản phẩm mà còn nợ — đến hạn thu (M3) */
    receivableDue: number;
    /** Chưa giao (chưa chụp / chờ hậu kỳ) — chưa đến hạn */
    receivableWaiting: number;
    payable: number;
    payableLab: number;
    payableVendor: number;
    payableSupplier: number;
    payableEmployee: number;
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
  /** Ngày giao sản phẩm (giao_san_pham hoàn thành) — null = chưa giao (M3, danh sách Cần thu) */
  delivered_at?: string | null;
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
  /** chua_lam | dang_lam | hoan_thanh — task đang làm vẫn là cam kết (ADR-016 §3) */
  status: string;
  /** Tên nhân viên ekip hoặc thợ ngoài */
  assignee_name: string | null;
  is_vendor: boolean;
}

/** Số lợi nhuận HĐ từ contract_financials(uuid[]) — nguồn duy nhất, drawer không cộng lại */
export interface ContractFinancials {
  revenue: number;
  task_cost: number;
  print_cost: number;
  cogs: number;
  direct_cost: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
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
    /** = contract_date, fallback created_at (giữ cho tương thích) */
    created_at: string;
    contract_date: string | null;
    /** Ngày chụp — mốc ghi nhận doanh thu (ADR-016 §2) */
    work_date: string | null;
    paid_amount: number;
    remaining_amount: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
  };
  financials: ContractFinancials;
  details: ContractDetail[];
  tasks: PersonalTask[];
  orders: ProductionOrder[];
  expenses: OperationalExpense[];
  inventory: InventoryCostItem[];
}
