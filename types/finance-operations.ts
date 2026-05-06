import type { PaginatedResult } from "@/types/finance-dashboard";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ApprovalFilter = "all" | "approved" | "pending";

export interface MonthYearPageParams {
  page?: number;
  pageSize?: number;
  month?: number;
  year?: number;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: string;
  category_code: string;
  is_default: boolean | null;
  updated_at: string | null;
}

export interface FinanceContractOption {
  id: string;
  contract_code: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
}

export interface ReceiptListItem {
  id: string;
  source_table?: "payments" | "receipts" | string | null;
  source_id?: string | null;
  receipt_code?: string | null;
  receipt_date: string;
  receipt_type: string;
  payment_type: string;
  contract_id: string | null;
  contract_code: string | null;
  customer_name: string | null;
  receipt_amount: number;
  total_amount: number | null;
  remaining_amount: number | null;
  category_id: string | null;
  category_name: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface ExpenseListItem {
  id: string;
  expense_date: string;
  payment_method: string;
  category_id: string | null;
  category_name: string | null;
  amount: number;
  description: string | null;
  recipient: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  contract_id: string | null;
  image_url: string | null;
}

export interface DebtListItem {
  id: string;
  entity_name: string;
  entity_type: string;
  type: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  due_date: string | null;
  status: string | null;
  notes: string | null;
  updated_at: string | null;
  days_overdue: number;
  installment_total?: number | null;
  installment_paid?: number | null;
  installment_amount?: number | null;
  platform?: string | null;
  card_id?: string | null;
}

export interface LabDebtItem {
  lab_id: string;
  lab_name: string;
  order_count: number;
  total_orders: number;
  total_paid: number;
  remaining: number;
}

export interface FixedCostItem {
  id: string;
  cost_code: string;
  cost_name: string;
  cost_type: string | null;
  monthly_amount: number | null;
  deposit_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  updated_at: string | null;
}

export interface InvestmentItem {
  id: string;
  name: string;
  category: string;
  serial_number: string | null;
  purchase_date: string;
  purchase_price: number;
  linked_revenue: number | null;
  salvage_value: number | null;
  useful_life_months: number | null;
  depreciation_method: string | null;
  monthly_depreciation: number;
  book_value: number;
  status: string | null;
  condition: string | null;
  location: string | null;
  next_maintenance_date: string | null;
  maintenance_due: boolean;
  updated_at: string | null;
}

export interface SalaryAdjustmentItem {
  id: string;
  type: string;
  amount: number;
  reason: string;
  date: string;
  created_at: string;
}

export interface SalaryItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  position: string | null;
  month: number;
  year: number;
  base_salary: number;
  product_salary: number;
  bonus: number;
  penalty: number;
  advance_payment: number;
  total_salary: number;
  net_salary: number;
  paid_amount: number;
  remaining_amount: number;
  adjustments: SalaryAdjustmentItem[];
  updated_at: string | null;
}

export interface SalarySummary {
  total_employees: number;
  total_salary: number;
  base_salary_total: number;
  product_salary_total: number;
  bonus_total: number;
  penalty_total: number;
  advance_total: number;
}

export interface SalaryPageData {
  items: SalaryItem[];
  summary: SalarySummary;
}

export interface GoalContributionItem {
  id: string;
  goal_id: string;
  amount: number;
  contribution_date: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface GoalItem {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: string | null;
  notes: string | null;
  created_at?: string | null;
  icon?: string | null;
  color?: string | null;
  progress_percent: number;
  remaining: number;
  months_left: number | null;
  monthly_needed: number | null;
  contributions: GoalContributionItem[];
  updated_at: string | null;
}

export interface BudgetActualItem {
  id: string;
  category_name: string;
  budget_amount: number;
  period_month: number;
  period_year: number;
  notes: string | null;
  actual_spent: number;
  usage_percent: number;
}

export interface CloseListItem {
  id: string;
  period: string;
  status: string;
  locked_at: string | null;
  locked_by: string | null;
  locked_user_name?: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CloseTaskItem {
  id: string;
  close_id: string;
  step_number: number;
  step_name: string;
  status: string;
  assignee_id: string | null;
  assignee_name?: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface CloseDetailData {
  close: CloseListItem & {
    created_by: string | null;
    created_user_name?: string | null;
    snapshot_metrics?: unknown;
  };
  tasks: CloseTaskItem[];
}

export interface IntegrityReportItem {
  id: string;
  scan_date: string | null;
  status: string | null;
  checks: unknown;
  total_issues: number | null;
  warning_count: number | null;
  info_count: number | null;
  created_at: string | null;
}

export type ReceiptPage = PaginatedResult<ReceiptListItem>;
export type ExpensePage = PaginatedResult<ExpenseListItem>;
