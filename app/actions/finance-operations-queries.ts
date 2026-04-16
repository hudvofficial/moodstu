"use server";

import { withAuth } from "@/lib/auth_utils";
import { isMissingRpcError, monthWindowOptional, relationText } from "@/lib/finance-utils";
import type { PaginatedResult } from "@/types/finance-dashboard";
import type {
  ApprovalFilter,
  DebtListItem,
  ExpenseListItem,
  FinanceCategory,
  FinanceContractOption,
  FixedCostItem,
  GoalContributionItem,
  GoalItem,
  InvestmentItem,
  LabDebtItem,
  MonthYearPageParams,
  ReceiptListItem,
  SalaryAdjustmentItem,
  SalaryItem,
  SalaryPageData,
} from "@/types/finance-operations";

function pageWindow(page = 1, pageSize = 12) {
  const current = Math.max(1, page);
  const size = Math.max(1, pageSize);
  const from = (current - 1) * size;
  return { current, size, from, to: from + size - 1 };
}

function daysOverdue(dueDate: string | null, status: string | null) {
  if (!dueDate || status === "da_thanh_toan" || status === "closed") return 0;
  const today = new Date();
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime()) || due >= today) return 0;
  return Math.floor((today.getTime() - due.getTime()) / 86400000);
}

function sanitizePostgrestSearch(value: string) {
  return value.replace(/[%_(),."\\]/g, "").trim().slice(0, 100);
}

function investmentBookValue(row: {
  purchase_date: string;
  purchase_price: number;
  salvage_value: number | null;
  useful_life_months: number | null;
}) {
  const usefulLife = row.useful_life_months || 36;
  const salvage = row.salvage_value || 0;
  const monthly = usefulLife > 0 ? Math.max(0, row.purchase_price - salvage) / usefulLife : 0;
  const purchasedAt = new Date(row.purchase_date);
  const now = new Date();
  const months = Number.isNaN(purchasedAt.getTime())
    ? 0
    : Math.max(0, (now.getFullYear() - purchasedAt.getFullYear()) * 12 + now.getMonth() - purchasedAt.getMonth());
  return {
    monthly_depreciation: Math.round(monthly),
    book_value: Math.max(salvage, Math.round(row.purchase_price - months * monthly)),
  };
}

export async function checkFinancePeriodLocked(date: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("is_period_locked", { p_date: date });
    if (error && isMissingRpcError(error)) {
      const { data: close, error: closeError } = await supabase
        .from("finance_monthly_closes")
        .select("status")
        .eq("period", date.slice(0, 7))
        .maybeSingle();
      if (closeError) return false;
      return close?.status === "locked";
    }
    if (error) throw new Error(`Khong the kiem tra khoa so: ${error.message}`);
    return Boolean(data);
  });
}

export async function fetchFinanceCategories(type: "thu" | "chi" | "all" = "all") {
  return withAuth(async (supabase) => {
    let query = supabase
      .from("transaction_categories")
      .select("id, name, type, category_code, is_default, updated_at")
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (type !== "all") query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw new Error(`Loi tai danh muc: ${error.message}`);
    return (data || []) as FinanceCategory[];
  });
}

export async function fetchContractOptions(limit = 60) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("contracts")
      .select("id, contract_code, total_amount, paid_amount, remaining_amount, customer:customer_id(full_name)")
      .is("deleted_at", null)
      .order("contract_date", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Loi tai hop dong: ${error.message}`);
    return (data || []).map((row) => ({
      id: row.id,
      contract_code: row.contract_code,
      customer_name: relationText((row as Record<string, unknown>).customer, "full_name") || "",
      total_amount: row.total_amount || 0,
      paid_amount: row.paid_amount || 0,
      remaining_amount: row.remaining_amount || 0,
    })) satisfies FinanceContractOption[];
  });
}

export async function fetchReceipts(params: MonthYearPageParams & { search?: string; receiptType?: string } = {}) {
  return withAuth(async (supabase) => {
    const { current, size, from, to } = pageWindow(params.page, params.pageSize);
    const window = monthWindowOptional(params.month, params.year);
    let query = supabase
      .from("receipts")
      .select(
        "id, receipt_date, receipt_type, payment_type, contract_id, contract_code, customer_name, receipt_amount, total_amount, remaining_amount, category_id, category_name, status, notes, created_at, updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("receipt_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (window) query = query.gte("receipt_date", window.start).lt("receipt_date", window.end);
    if (params.receiptType && params.receiptType !== "all") {
      query = query.eq("receipt_type", params.receiptType);
    }

    if (params.search) {
      const sanitized = sanitizePostgrestSearch(params.search);
      if (sanitized) {
        const s = `%${sanitized}%`;
        query = query.or(`contract_code.ilike.${s},customer_name.ilike.${s},category_name.ilike.${s},notes.ilike.${s}`);
      }
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Loi tai phieu thu: ${error.message}`);
    return {
      items: (data || []) as ReceiptListItem[],
      total: count || 0,
      page: current,
      pageSize: size,
    } satisfies PaginatedResult<ReceiptListItem>;
  });
}

export interface ReceiptStats {
  totalReceipts: number;
  totalAmount: number;
  completedCount: number;
  pendingCount: number;
}

export async function fetchReceiptStats(month?: number, year?: number) {
  return withAuth(async (supabase) => {
    const window = monthWindowOptional(month, year);
    let query = supabase
      .from("receipts")
      .select("receipt_amount, status", { count: "exact" })
      .is("deleted_at", null);

    if (window) query = query.gte("receipt_date", window.start).lt("receipt_date", window.end);

    const { data, error, count } = await query;
    if (error) throw new Error(`Loi tai receipt stats: ${error.message}`);

    const rows = data || [];
    const totalAmount = rows.reduce((sum, r) => sum + (r.receipt_amount || 0), 0);
    const doneStatuses = new Set(["completed", "confirmed", "approved", "hoan_thanh"]);
    const cancelledStatuses = new Set(["cancelled", "da_huy"]);

    const completedCount = rows.filter((r) => doneStatuses.has((r.status || "").toLowerCase())).length;
    const pendingCount = rows.filter((r) => {
      const s = (r.status || "").toLowerCase();
      return !doneStatuses.has(s) && !cancelledStatuses.has(s);
    }).length;

    return {
      totalReceipts: count || rows.length,
      totalAmount,
      completedCount,
      pendingCount,
    } satisfies ReceiptStats;
  });
}

export async function fetchExpenses(params: MonthYearPageParams & { approval?: ApprovalFilter } = {}) {
  return withAuth(async (supabase) => {
    const { current, size, from, to } = pageWindow(params.page, params.pageSize);
    const window = monthWindowOptional(params.month, params.year);
    let query = supabase
      .from("expenses")
      .select(
        "id, expense_date, payment_method, category_id, amount, description, recipient, approved_by, created_by, created_at, updated_at, contract_id, image_url, category:category_id(name)",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (window) query = query.gte("expense_date", window.start).lt("expense_date", window.end);
    if (params.approval === "approved") query = query.not("approved_by", "is", null);
    if (params.approval === "pending") query = query.is("approved_by", null);

    const { data, error, count } = await query;
    if (error) throw new Error(`Loi tai phieu chi: ${error.message}`);
    const items = (data || []).map((row) => ({
      id: row.id,
      expense_date: row.expense_date,
      payment_method: row.payment_method,
      category_id: row.category_id,
      category_name: relationText((row as Record<string, unknown>).category, "name"),
      amount: row.amount,
      description: row.description,
      recipient: row.recipient,
      approved_by: row.approved_by,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      contract_id: row.contract_id,
      image_url: row.image_url,
    })) satisfies ExpenseListItem[];

    return { items, total: count || 0, page: current, pageSize: size } satisfies PaginatedResult<ExpenseListItem>;
  });
}

export interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  approvedCount: number;
  pendingCount: number;
}

export async function fetchExpenseStats(month?: number, year?: number) {
  return withAuth(async (supabase) => {
    const window = monthWindowOptional(month, year);
    let query = supabase
      .from("expenses")
      .select("amount, approved_by", { count: "exact" })
      .is("deleted_at", null);

    if (window) query = query.gte("expense_date", window.start).lt("expense_date", window.end);

    const { data, error, count } = await query;
    if (error) throw new Error(`Loi tai expense stats: ${error.message}`);

    const rows = data || [];
    const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

    const approvedCount = rows.filter((r) => r.approved_by !== null).length;
    const pendingCount = rows.filter((r) => r.approved_by === null).length;

    return {
      totalExpenses: count || rows.length,
      totalAmount,
      approvedCount,
      pendingCount,
    } satisfies ExpenseStats;
  });
}

export async function fetchDebts(params: { page?: number; pageSize?: number } = {}) {
  return withAuth(async (supabase) => {
    const { current, size, from, to } = pageWindow(params.page, params.pageSize || 20);
    const { data, error, count } = await supabase
      .from("debts")
      .select("id, entity_name, entity_type, type, amount, paid_amount, remaining, due_date, status, notes, updated_at, installment_total, installment_paid, installment_amount, platform, card_id", { count: "exact" })
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Lỗi tải công nợ: ${error.message}`);
    const items = (data || []).map((row) => {
      const paid = row.paid_amount || 0;
      const remaining = row.remaining ?? Math.max(0, row.amount - paid);
      return {
        id: row.id,
        entity_name: row.entity_name,
        entity_type: row.entity_type,
        type: row.type === 'receivable' ? 'Phải thu' : 'Phải trả',
        amount: row.amount,
        paid_amount: paid,
        remaining,
        due_date: row.due_date,
        status: row.status,
        notes: row.notes,
        updated_at: row.updated_at,
        days_overdue: daysOverdue(row.due_date, row.status),
        installment_total: row.installment_total,
        installment_paid: row.installment_paid,
        installment_amount: row.installment_amount,
        platform: row.platform,
        card_id: row.card_id,
      };
    }) satisfies DebtListItem[];
    return { items, total: count || 0, page: current, pageSize: size } satisfies PaginatedResult<DebtListItem>;
  });
}

export interface DebtStats {
  receivable: number;
  payable: number;
  overdue: number;
  net_debt: number;
  aging: {
    not_due: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
  };
}

export async function fetchDebtStats() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("debts")
      .select("type, remaining, amount, paid_amount, due_date, status")
      .is("deleted_at", null);

    if (error) throw new Error(`Lỗi tải dữ liệu thống kê công nợ: ${error.message}`);

    const rows = data || [];
    const stats = rows.reduce(
      (acc, item) => {
        const paid = (item.paid_amount as number) || 0;
        const remaining = item.remaining ?? Math.max(0, (item.amount as number) - paid);
        if (typeof item.type === "string" && (item.type === "receivable" || item.type.toLowerCase().includes("thu"))) {
          acc.receivable += remaining;
        } else {
          acc.payable += remaining;
        }

        acc.net_debt = acc.receivable - acc.payable;

        const overdueDays = daysOverdue(item.due_date as string | null, (item.status as string) || null);
        if (overdueDays > 0) {
          acc.overdue += remaining;
          if (overdueDays <= 30) {
            acc.aging.days_1_30 += remaining;
          } else if (overdueDays <= 60) {
            acc.aging.days_31_60 += remaining;
          } else if (overdueDays <= 90) {
            acc.aging.days_61_90 += remaining;
          } else {
            acc.aging.over_90 += remaining;
          }
        } else {
          acc.aging.not_due += remaining;
        }

        return acc;
      },
      {
        receivable: 0, payable: 0, overdue: 0, net_debt: 0,
        aging: { not_due: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 }
      } as DebtStats
    );

    return stats;
  });
}
// ─── CREDIT CARDS ───────────────────────────

export interface CreditCardOption {
  id: string;
  bank_name: string;
  last_4: string | null;
  statement_day: number | null;
  due_day: number | null;
  credit_limit: number | null;
}

export async function fetchCreditCards() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("credit_cards")
      .select("id, bank_name, last_4, statement_day, due_day, credit_limit")
      .order("bank_name", { ascending: true });

    if (error) throw new Error(`Lỗi tải danh sách thẻ tín dụng: ${error.message}`);
    return (data || []) as CreditCardOption[];
  });
}

export async function fetchLabDebts() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("finance_lab_debt_summary");
    if (!error) return (data || []) as LabDebtItem[];
    if (isMissingRpcError(error)) {
      const [ordersResult, paymentsResult] = await Promise.all([
        supabase
          .from("printing_orders")
          .select("lab_id, total_amount, payment_status, lab:lab_id(lab_name)")
          .is("deleted_at", null)
          .not("lab_id", "is", null),
        supabase.from("lab_payments").select("lab_id, amount"),
      ]);

      if (ordersResult.error) throw new Error(`Loi tai don lab: ${ordersResult.error.message}`);
      if (paymentsResult.error) throw new Error(`Loi tai thanh toan lab: ${paymentsResult.error.message}`);

      const byLab = new Map<string, LabDebtItem>();
      for (const order of ordersResult.data || []) {
        if (!order.lab_id) continue;
        const paid = order.payment_status === "paid" || order.payment_status === "da_thanh_toan";
        if (paid) continue;
        const current = byLab.get(order.lab_id) || {
          lab_id: order.lab_id,
          lab_name: relationText((order as Record<string, unknown>).lab, "lab_name") || "Lab",
          order_count: 0,
          total_orders: 0,
          total_paid: 0,
          remaining: 0,
        };
        current.order_count += 1;
        current.total_orders += order.total_amount || 0;
        byLab.set(order.lab_id, current);
      }

      for (const payment of paymentsResult.data || []) {
        if (!payment.lab_id) continue;
        const current = byLab.get(payment.lab_id);
        if (current) current.total_paid += payment.amount || 0;
      }

      return Array.from(byLab.values())
        .map((item) => ({ ...item, remaining: Math.max(0, item.total_orders - item.total_paid) }))
        .filter((item) => item.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining);
    }
    if (error) throw new Error(`Lỗi tải công nợ lab: ${error.message}`);
    return (data || []) as LabDebtItem[];
  });
}

export async function fetchFixedCosts() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("fixed_costs")
      .select("id, cost_code, cost_name, cost_type, monthly_amount, deposit_amount, start_date, end_date, description, updated_at")
      .order("cost_name", { ascending: true });

    if (error) throw new Error(`Loi tai chi phi co dinh: ${error.message}`);
    return (data || []) as FixedCostItem[];
  });
}

export async function fetchInvestments() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("investments")
      .select("id, name, category, purchase_date, purchase_price, salvage_value, useful_life_months, depreciation_method, status, condition, location, next_maintenance_date, updated_at")
      .order("purchase_date", { ascending: false });

    if (error) throw new Error(`Loi tai tai san: ${error.message}`);
    const today = new Date().toISOString().split("T")[0];
    return (data || []).map((row) => {
      const value = investmentBookValue(row);
      return {
        ...row,
        monthly_depreciation: value.monthly_depreciation,
        book_value: value.book_value,
        maintenance_due: Boolean(row.next_maintenance_date && row.next_maintenance_date <= today),
      };
    }) satisfies InvestmentItem[];
  });
}

export async function fetchSalaries(month: number, year: number) {
  return withAuth(async (supabase) => {
    const [rowsResult, summaryResult] = await Promise.all([
      supabase
        .from("employee_salaries")
        .select(
          "id, employee_id, month, year, base_salary, product_salary, bonus, penalty, advance_payment, total_salary, net_salary, paid_amount, remaining_amount, updated_at, employee:employee_id(full_name, employee_code, position), salary_adjustments(id, type, amount, reason, date, created_at)",
        )
        .eq("month", month)
        .eq("year", year)
        .order("employee_id", { ascending: true }),
      supabase
        .from("monthly_salaries")
        .select("total_employees, total_salary, base_salary_total, product_salary_total, bonus_total, penalty_total, advance_total")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle(),
    ]);

    if (rowsResult.error) throw new Error(`Loi tai bang luong: ${rowsResult.error.message}`);
    if (summaryResult.error) throw new Error(`Loi tai tong luong: ${summaryResult.error.message}`);

    const items = (rowsResult.data || []).map((row) => ({
      id: row.id,
      employee_id: row.employee_id,
      employee_name: relationText((row as Record<string, unknown>).employee, "full_name") || "Nhan vien",
      employee_code: relationText((row as Record<string, unknown>).employee, "employee_code"),
      position: relationText((row as Record<string, unknown>).employee, "position"),
      month: row.month,
      year: row.year,
      base_salary: row.base_salary || 0,
      product_salary: row.product_salary || 0,
      bonus: row.bonus || 0,
      penalty: row.penalty || 0,
      advance_payment: row.advance_payment || 0,
      total_salary: row.total_salary || 0,
      net_salary: row.net_salary || 0,
      paid_amount: row.paid_amount || 0,
      remaining_amount: row.remaining_amount || 0,
      adjustments: (((row as Record<string, unknown>).salary_adjustments as SalaryAdjustmentItem[] | undefined) || [])
        .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
      updated_at: row.updated_at,
    })) satisfies SalaryItem[];

    const summary = summaryResult.data;
    return {
      items,
      summary: {
        total_employees: summary?.total_employees || items.length,
        total_salary: summary?.total_salary || items.reduce((sum, item) => sum + item.net_salary, 0),
        base_salary_total: summary?.base_salary_total || items.reduce((sum, item) => sum + item.base_salary, 0),
        product_salary_total: summary?.product_salary_total || items.reduce((sum, item) => sum + item.product_salary, 0),
        bonus_total: summary?.bonus_total || items.reduce((sum, item) => sum + item.bonus, 0),
        penalty_total: summary?.penalty_total || items.reduce((sum, item) => sum + item.penalty, 0),
        advance_total: summary?.advance_total || items.reduce((sum, item) => sum + item.advance_payment, 0),
      },
    } satisfies SalaryPageData;
  });
}

export async function fetchGoals(params: { page?: number; pageSize?: number } = {}) {
  return withAuth(async (supabase) => {
    const { current, size, from, to } = pageWindow(params.page, params.pageSize || 20);
    const { data, error, count } = await supabase
      .from("financial_goals")
      .select("id, name, target_amount, current_amount, deadline, status, notes, updated_at, goal_contributions(id, goal_id, amount, contribution_date, notes, created_at)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Lỗi tải mục tiêu: ${error.message}`);
    const now = new Date();
    const items = (data || []).map((goal) => {
      const target = goal.target_amount || 0;
      const current_amt = goal.current_amount || 0;
      const remaining = Math.max(0, target - current_amt);
      let monthsLeft: number | null = null;
      let monthlyNeeded: number | null = null;
      if (goal.deadline) {
        const deadlineDate = new Date(goal.deadline);
        // W4 audit fix: dùng calendar month diff thay vì hardcode 30 ngày
        monthsLeft = Math.max(0,
          (deadlineDate.getFullYear() - now.getFullYear()) * 12
          + deadlineDate.getMonth() - now.getMonth()
        );
        monthlyNeeded = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
      }
      return {
        id: goal.id,
        name: goal.name,
        target_amount: target,
        current_amount: current_amt,
        deadline: goal.deadline,
        status: goal.status,
        notes: goal.notes,
        progress_percent: target > 0 ? Math.min(100, Math.round((current_amt / target) * 100)) : 0,
        remaining,
        months_left: monthsLeft,
        monthly_needed: monthlyNeeded,
        contributions: (((goal as Record<string, unknown>).goal_contributions as GoalContributionItem[] | undefined) || [])
          .sort((a, b) => (b.contribution_date || "").localeCompare(a.contribution_date || "")),
        updated_at: goal.updated_at,
      };
    }) satisfies GoalItem[];
    return { items, total: count || 0, page: current, pageSize: size } satisfies PaginatedResult<GoalItem>;
  });
}

// ─── RECEIPT DETAIL ─────────────────────────

export async function getReceiptDetail(id: string) {
  return withAuth(async (supabase) => {
    const { data: receipt, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !receipt) {
      throw new Error("Không tìm thấy phiếu thu hoặc phiếu thu đã bị xóa.");
    }

    return receipt;
  });
}

// ─── EXPENSE DETAIL ─────────────────────────

export async function getExpenseDetail(id: string) {
  return withAuth(async (supabase) => {
    const { data: expense, error } = await supabase
      .from("expenses")
      .select(`
        id,
        expense_date,
        payment_method,
        category_id,
        amount,
        description,
        recipient,
        approved_by,
        created_at,
        updated_at,
        contract_id,
        image_url,
        category:category_id(name),
        contract:contract_id(contract_code)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !expense) {
      throw new Error("Không tìm thấy phiếu chi hoặc phiếu chi đã bị xóa.");
    }

    return {
      id: expense.id,
      expense_date: expense.expense_date,
      payment_method: expense.payment_method,
      category_id: expense.category_id,
      amount: expense.amount,
      description: expense.description,
      recipient: expense.recipient,
      approved_by: expense.approved_by,
      created_at: expense.created_at,
      updated_at: expense.updated_at,
      contract_id: expense.contract_id,
      image_url: expense.image_url,
      category_name: Array.isArray(expense.category) ? expense.category[0]?.name : ((expense.category as Record<string, unknown>)?.name as string) || null,
      contract_code: Array.isArray(expense.contract) ? expense.contract[0]?.contract_code : ((expense.contract as Record<string, unknown>)?.contract_code as string) || null,
    };
  });
}
