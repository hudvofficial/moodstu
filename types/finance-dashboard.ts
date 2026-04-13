export interface DashboardMetrics {
  totalInflow: number;
  totalOutflow: number;
  profit: number;
  monthChangePercent: number;
  contractsNew: number;
  contractsDone: number;
  totalDebt: number;
}

export interface RevenueByMonthItem {
  month: string;
  revenue: number;
  rawMonth: number;
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
  taskCost: number;
  printCost: number;
  expenseCost: number;
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
