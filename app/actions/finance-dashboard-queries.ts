"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/auth_utils";
import { isMissingRpcError, monthWindow, relationText, asNumber, asString } from "@/lib/finance-utils";
import type {
  ContractProfitReportParams,
  ContractProfitRow,
  DashboardMetrics,
  FinanceContractListItem,
  LedgerItem,
  PaginatedResult,
  RevenueByMonthItem,
  ServiceDistributionItem,
  ContractProfitDetailData,
} from "@/types/finance-dashboard";
// Mock data removed — Phase 04: all queries go through real DB/RPC pipeline

type RpcRow = Record<string, unknown>;

// Local helpers — specific to this file (not duplicated elsewhere)

function normalizeContractRows(data: unknown): FinanceContractListItem[] {
  return ((data as RpcRow[] | null) || []).map((row) => {
    const rawCustomer = row.customers;
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
    return {
      id: asString(row.id),
      contract_code: asString(row.contract_code, "") || null,
      work_date: asString(row.work_date, "") || null,
      contract_date: asString(row.contract_date, "") || null,
      status: asString(row.status, "") || null,
      total_amount: asNumber(row.total_amount),
      paid_amount: asNumber(row.paid_amount),
      remaining_amount: asNumber(row.remaining_amount),
      customers: customer
        ? {
          id: asString((customer as RpcRow).id),
          full_name: asString((customer as RpcRow).full_name),
          phone: asString((customer as RpcRow).phone, "") || null,
        }
        : null,
    };
  });
}

function sumRows(rows: unknown[] | null | undefined, field: string) {
  return (rows || []).reduce<number>((sum, row) => sum + asNumber((row as RpcRow)[field]), 0);
}

async function getDashboardMetricsFallback(
  supabase: SupabaseClient,
  month: number,
  year: number,
): Promise<DashboardMetrics> {
  const current = monthWindow(month, year);
  const previousDate = new Date(year, month - 2, 1);
  const previous = monthWindow(previousDate.getMonth() + 1, previousDate.getFullYear());

  const [payments, receipts, expenses, prevPayments, prevReceipts, newContracts, doneContracts, debtRows] = await Promise.all([
    supabase.from("payments").select("amount").is("deleted_at", null).gte("payment_date", current.start).lt("payment_date", current.end),
    supabase.from("receipts").select("receipt_amount").is("deleted_at", null).is("contract_id", null).gte("receipt_date", current.start).lt("receipt_date", current.end),
    supabase.from("expenses").select("amount").is("deleted_at", null).gte("expense_date", current.start).lt("expense_date", current.end),
    supabase.from("payments").select("amount").is("deleted_at", null).gte("payment_date", previous.start).lt("payment_date", previous.end),
    supabase.from("receipts").select("receipt_amount").is("deleted_at", null).is("contract_id", null).gte("receipt_date", previous.start).lt("receipt_date", previous.end),
    supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("contract_date", current.start).lt("contract_date", current.end),
    supabase.from("contracts").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "hoan_thanh").gte("updated_at", current.start).lt("updated_at", current.end),
    supabase.from("contracts").select("remaining_amount").is("deleted_at", null).gt("remaining_amount", 0),
  ]);

  const firstError = payments.error || receipts.error || expenses.error || prevPayments.error || prevReceipts.error || newContracts.error || doneContracts.error || debtRows.error;
  if (firstError) throw new Error(firstError.message);

  const totalInflow = sumRows(payments.data, "amount") + sumRows(receipts.data, "receipt_amount");
  const previousInflow = sumRows(prevPayments.data, "amount") + sumRows(prevReceipts.data, "receipt_amount");
  const totalOutflow = sumRows(expenses.data, "amount");

  return {
    totalInflow,
    totalOutflow,
    profit: totalInflow - totalOutflow,
    monthChangePercent: previousInflow === 0 ? (totalInflow > 0 ? 100 : 0) : Math.round(((totalInflow - previousInflow) / previousInflow) * 1000) / 10,
    contractsNew: newContracts.count || 0,
    contractsDone: doneContracts.count || 0,
    totalDebt: sumRows(debtRows.data, "remaining_amount"),
  };
}

async function getRevenueByMonthFallback(supabase: SupabaseClient, year: number): Promise<RevenueByMonthItem[]> {
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const [payments, receipts] = await Promise.all([
    supabase.from("payments").select("payment_date, amount").is("deleted_at", null).gte("payment_date", start).lt("payment_date", end),
    supabase.from("receipts").select("receipt_date, receipt_amount").is("deleted_at", null).is("contract_id", null).gte("receipt_date", start).lt("receipt_date", end),
  ]);

  if (payments.error) throw new Error(payments.error.message);
  if (receipts.error) throw new Error(receipts.error.message);

  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const row of payments.data || []) byMonth[new Date(row.payment_date).getMonth()] += row.amount || 0;
  for (const row of receipts.data || []) byMonth[new Date(row.receipt_date).getMonth()] += row.receipt_amount || 0;

  return byMonth.map((revenue, index) => ({
    month: `Tháng ${index + 1}`,
    revenue,
    rawMonth: index + 1,
  }));
}

async function getServiceDistributionFallback(
  supabase: SupabaseClient,
  month: number,
  year: number,
): Promise<ServiceDistributionItem[]> {
  const window = monthWindow(month, year);
  const { data, error } = await supabase
    .from("contracts")
    .select("id, service_type, total_amount")
    .is("deleted_at", null)
    .gte("contract_date", window.start)
    .lt("contract_date", window.end);

  if (error) throw new Error(error.message);

  const grouped = new Map<string, { value: number; revenue: number }>();
  for (const row of data || []) {
    const name = asString(row.service_type, "Khác") || "Khác";
    const current = grouped.get(name) || { value: 0, revenue: 0 };
    current.value += 1;
    current.revenue += row.total_amount || 0;
    grouped.set(name, current);
  }

  return Array.from(grouped.entries())
    .map(([name, item]) => ({ name, value: item.value, revenue: item.revenue }))
    .sort((a, b) => b.value - a.value || b.revenue - a.revenue);
}

function addByContract(map: Map<string, number>, rows: unknown[] | null | undefined, amountField: string) {
  for (const row of rows || []) {
    const item = row as RpcRow;
    const contractId = asString(item.contract_id);
    if (!contractId) continue;
    map.set(contractId, (map.get(contractId) || 0) + asNumber(item[amountField]));
  }
}

async function getContractProfitReportFallback(
  supabase: SupabaseClient,
  filters: ContractProfitReportParams,
): Promise<PaginatedResult<ContractProfitRow>> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("contracts")
    .select("id, contract_code, contract_date, status, total_amount, discount_amount, paid_amount, remaining_amount, customers(full_name)", { count: "exact" })
    .is("deleted_at", null)
    .order("contract_date", { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.fromDate) query = query.gte("contract_date", filters.fromDate);
  if (filters.toDate) query = query.lte("contract_date", filters.toDate);

  const { data: contracts, error, count } = await query;
  if (error) throw new Error(error.message);

  const ids = (contracts || []).map((contract) => contract.id);
  const taskCost = new Map<string, number>();
  const printCost = new Map<string, number>();
  const expenseCost = new Map<string, number>();
  const packageRev = new Map<string, number>();
  const addonRev = new Map<string, number>();

  if (ids.length > 0) {
    const [items, tasks, prints, expenses] = await Promise.all([
      supabase.from("contract_items").select("contract_id, total_amount, is_addon").is("deleted_at", null).in("contract_id", ids),
      supabase.from("work_tasks").select("contract_id, cost").in("contract_id", ids),
      supabase.from("printing_orders").select("contract_id, total_amount").is("deleted_at", null).in("contract_id", ids),
      supabase.from("expenses").select("contract_id, amount, description").is("deleted_at", null).in("contract_id", ids),
    ]);
    if (items.error) throw new Error(items.error.message);
    if (tasks.error) throw new Error(tasks.error.message);
    if (prints.error) throw new Error(prints.error.message);
    if (expenses.error) throw new Error(expenses.error.message);
    addByContract(taskCost, tasks.data, "cost");
    addByContract(printCost, prints.data, "total_amount");
    addByContract(
      expenseCost,
      (expenses.data || []).filter((row) => !row.description?.startsWith("[Auto-Print]")),
      "amount",
    );

    for (const item of items.data || []) {
      const cId = item.contract_id;
      if (!cId) continue;
      const amount = Number(item.total_amount) || 0;
      if (item.is_addon) {
        addonRev.set(cId, (addonRev.get(cId) || 0) + amount);
      } else {
        packageRev.set(cId, (packageRev.get(cId) || 0) + amount);
      }
    }
  }

  const items = (contracts || []).map((contract) => {
    const tasks = taskCost.get(contract.id) || 0;
    const prints = printCost.get(contract.id) || 0;
    const expenses = expenseCost.get(contract.id) || 0;
    const totalCost = tasks + prints + expenses;
    const totalAmount = contract.total_amount || 0;
    const profit = totalAmount - totalCost;
    return {
      id: contract.id,
      contractCode: contract.contract_code,
      customerName: relationText((contract as RpcRow).customers, "full_name") || "Khách vãng lai",
      contractDate: contract.contract_date,
      status: contract.status,
      totalAmount,
      paidAmount: contract.paid_amount || 0,
      remainingAmount: contract.remaining_amount || 0,
      packageRevenue: packageRev.get(contract.id) || 0,
      addonRevenue: addonRev.get(contract.id) || 0,
      discount: contract.discount_amount || 0,
      taskCost: tasks,
      printCost: prints,
      expenseCost: expenses,
      totalCost,
      profit,
      profitMargin: totalAmount > 0 ? Math.round((profit / totalAmount) * 1000) / 10 : 0,
    };
  }) satisfies ContractProfitRow[];

  return { items, total: count || 0, page, pageSize };
}

async function fetchLedgerFallback(
  supabase: SupabaseClient,
  params: { page: number; pageSize: number; month?: number; year?: number; type?: "in" | "out" | "all" },
): Promise<PaginatedResult<LedgerItem>> {
  const window = params.month && params.year ? monthWindow(params.month, params.year) : null;
  let paymentsQuery = supabase.from("payments").select("id, payment_date, amount, receipt_code, notes, payment_stage, payment_method, approved_by, created_at").is("deleted_at", null);
  let receiptsQuery = supabase.from("receipts").select("id, receipt_date, receipt_amount, contract_code, customer_name, category_name, payment_type, notes, status, created_at").is("deleted_at", null).is("contract_id", null);
  let expensesQuery = supabase.from("expenses").select("id, expense_date, amount, recipient, payment_method, description, approved_by, created_at").is("deleted_at", null);

  if (window) {
    paymentsQuery = paymentsQuery.gte("payment_date", window.start).lt("payment_date", window.end);
    receiptsQuery = receiptsQuery.gte("receipt_date", window.start).lt("receipt_date", window.end);
    expensesQuery = expensesQuery.gte("expense_date", window.start).lt("expense_date", window.end);
  }

  const [payments, receipts, expenses] = await Promise.all([paymentsQuery, receiptsQuery, expensesQuery]);
  if (payments.error) throw new Error(payments.error.message);
  if (receipts.error) throw new Error(receipts.error.message);
  if (expenses.error) throw new Error(expenses.error.message);

  const rows: Array<LedgerItem & { createdAt: string | null }> = [];
  if (!params.type || params.type === "all" || params.type === "in") {
    for (const item of payments.data || []) {
      rows.push({
        id: item.id,
        sourceTable: "payments",
        direction: "in",
        transactionDate: item.payment_date,
        amount: item.amount || 0,
        code: item.receipt_code || `PAY-${item.id.slice(0, 8)}`,
        customerName: "-",
        categoryName: "-",
        paymentMethod: asString(item.payment_method, "-"),
        description: item.notes || item.payment_stage || "",
        status: item.approved_by ? "approved" : "pending",
        createdAt: item.created_at,
      });
    }
    for (const item of receipts.data || []) {
      rows.push({
        id: item.id,
        sourceTable: "receipts",
        direction: "in",
        transactionDate: item.receipt_date,
        amount: item.receipt_amount || 0,
        code: item.contract_code || `REC-${item.id.slice(0, 8)}`,
        customerName: item.customer_name || "-",
        categoryName: item.category_name || "-",
        paymentMethod: item.payment_type || "-",
        description: item.notes || "",
        status: item.status || "confirmed",
        createdAt: item.created_at,
      });
    }
  }

  if (!params.type || params.type === "all" || params.type === "out") {
    for (const item of expenses.data || []) {
      rows.push({
        id: item.id,
        sourceTable: "expenses",
        direction: "out",
        transactionDate: item.expense_date,
        amount: item.amount || 0,
        code: `EXP-${item.id.slice(0, 8)}`,
        customerName: item.recipient || "-",
        categoryName: "-",
        paymentMethod: asString(item.payment_method, "-"),
        description: item.description || "",
        status: item.approved_by ? "approved" : "pending",
        createdAt: item.created_at,
      });
    }
  }

  rows.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || (b.createdAt || "").localeCompare(a.createdAt || ""));
  const start = (params.page - 1) * params.pageSize;
  const pageRows = rows.slice(start, start + params.pageSize).map(({ createdAt, ...item }) => {
    void createdAt;
    return item;
  });
  return { items: pageRows, total: rows.length, page: params.page, pageSize: params.pageSize };
}

export async function getDashboardMetrics(month: number, year: number) {

  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .rpc("finance_dashboard_metrics", { p_month: month, p_year: year })
      .single();

    if (error && isMissingRpcError(error)) return getDashboardMetricsFallback(supabase, month, year);

    if (error) throw new Error(`Lỗi tải KPI tài chính: ${error.message}`);
    const row = (data || {}) as RpcRow;

    return {
      totalInflow: asNumber(row.total_inflow),
      totalOutflow: asNumber(row.total_outflow),
      profit: asNumber(row.profit),
      monthChangePercent: asNumber(row.month_change_percent),
      contractsNew: asNumber(row.contracts_new),
      contractsDone: asNumber(row.contracts_done),
      totalDebt: asNumber(row.total_debt),
    } satisfies DashboardMetrics;
  });
}

export async function getRevenueByMonth(year: number) {

  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("finance_revenue_by_month", {
      p_year: year,
    });

    if (error && isMissingRpcError(error)) return getRevenueByMonthFallback(supabase, year);

    if (error) throw new Error(`Lỗi tải doanh thu theo tháng: ${error.message}`);

    return ((data || []) as RpcRow[]).map((row) => ({
      month: asString(row.month_label),
      revenue: asNumber(row.revenue),
      rawMonth: asNumber(row.raw_month),
    })) satisfies RevenueByMonthItem[];
  });
}

export async function getServiceDistribution(month: number, year: number) {

  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("finance_service_distribution", {
      p_month: month,
      p_year: year,
    });

    if (error && isMissingRpcError(error)) return getServiceDistributionFallback(supabase, month, year);

    if (error) throw new Error(`Lỗi tải phân bổ dịch vụ: ${error.message}`);

    return ((data || []) as RpcRow[]).map((row) => ({
      name: asString(row.name, "Khác"),
      value: asNumber(row.value),
      revenue: asNumber(row.revenue),
    })) satisfies ServiceDistributionItem[];
  });
}

export async function getUpcomingContracts(limit: number = 5) {

  return withAuth(async (supabase) => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("contracts")
      .select("id, contract_code, work_date, status, total_amount, paid_amount, remaining_amount, customers(id, full_name, phone)")
      .gte("work_date", today)
      .is("deleted_at", null)
      .order("work_date", { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Lỗi tải hợp đồng sắp chụp: ${error.message}`);
    return normalizeContractRows(data);
  });
}

export async function getPendingCollections(limit: number = 5) {

  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("contracts")
      .select("id, contract_code, remaining_amount, contract_date, status, customers(id, full_name, phone)")
      .gt("remaining_amount", 0)
      .is("deleted_at", null)
      .order("contract_date", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Lỗi tải danh sách cần thu: ${error.message}`);
    return normalizeContractRows(data);
  });
}

export async function getContractProfitReport(filters: ContractProfitReportParams = {}) {

  return withAuth(async (supabase) => {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const { data, error } = await supabase.rpc("finance_contract_profit_report", {
      p_status: filters.status || "all",
      p_from: filters.fromDate || null,
      p_to: filters.toDate || null,
      p_page: page,
      p_page_size: pageSize,
    });

    if (error && isMissingRpcError(error)) return getContractProfitReportFallback(supabase, filters);

    if (error) throw new Error(`Lỗi tải báo cáo lợi nhuận: ${error.message}`);

    const rows = ((data || []) as RpcRow[]).map((row) => ({
      id: asString(row.id),
      contractCode: asString(row.contract_code),
      customerName: asString(row.customer_name, "Khách vãng lai"),
      contractDate: asString(row.contract_date, "") || null,
      status: asString(row.status, "draft"),
      totalAmount: asNumber(row.total_amount),
      paidAmount: asNumber(row.paid_amount),
      remainingAmount: asNumber(row.remaining_amount),
      packageRevenue: asNumber(row.package_revenue),
      addonRevenue: asNumber(row.addon_revenue),
      discount: asNumber(row.discount),
      taskCost: asNumber(row.task_cost),
      printCost: asNumber(row.print_cost),
      expenseCost: asNumber(row.expense_cost),
      totalCost: asNumber(row.total_cost),
      profit: asNumber(row.profit),
      profitMargin: asNumber(row.profit_margin),
    })) satisfies ContractProfitRow[];

    return {
      items: rows,
      total: rows.length > 0 ? asNumber((data?.[0] as RpcRow).total_count) : 0,
      page,
      pageSize,
    } satisfies PaginatedResult<ContractProfitRow>;
  });
}

export async function fetchLedger(params: {
  page: number;
  pageSize: number;
  month?: number;
  year?: number;
  type?: "in" | "out" | "all";
}) {

  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("finance_ledger", {
      p_page: params.page,
      p_page_size: params.pageSize,
      p_month: params.month || null,
      p_year: params.year || null,
      p_type: params.type || "all",
    });

    if (error && isMissingRpcError(error)) return fetchLedgerFallback(supabase, params);

    if (error) throw new Error(`Lỗi tải sổ cái thu chi: ${error.message}`);

    const rows = ((data || []) as RpcRow[]).map((row) => ({
      id: asString(row.id),
      sourceTable: asString(row.source_table) as LedgerItem["sourceTable"],
      direction: asString(row.direction) as LedgerItem["direction"],
      transactionDate: asString(row.transaction_date),
      amount: asNumber(row.amount),
      code: asString(row.code),
      customerName: asString(row.customer_name, "-"),
      categoryName: asString(row.category_name, "-"),
      paymentMethod: asString(row.payment_method, "-"),
      description: asString(row.description),
      status: asString(row.status, "pending"),
    })) satisfies LedgerItem[];

    return {
      items: rows,
      total: rows.length > 0 ? asNumber((data?.[0] as RpcRow).total_count) : 0,
      page: params.page,
      pageSize: params.pageSize,
    } satisfies PaginatedResult<LedgerItem>;
  });
}

export async function getContractFinanceDetails(contractId: string) {

  return withAuth(async (supabase) => {
    const { data: contract, error: contractErr } = await supabase
      .from("contracts")
      .select("id, total_amount, contract_code, status, created_at, customers(full_name)")
      .eq("id", contractId)
      .single();

    if (contractErr) throw new Error(`Lỗi tải hợp đồng: ${contractErr.message}`);

    const [details, tasks, prints, expenses] = await Promise.all([
      supabase.from("contract_details").select("id, service_name, quantity, unit_price, total_amount, item_type, addon_category").eq("contract_id", contractId),
      supabase.from("work_tasks").select("id, work_type, cost, employees(full_name)").eq("contract_id", contractId),
      supabase.from("printing_orders").select("id, item_name, quantity, cost, payment_status").eq("contract_id", contractId),
      supabase.from("expenses").select("id, description, amount, expense_date").eq("contract_id", contractId).is("deleted_at", null).not("description", "like", "[Auto-Print]%"),
    ]);

    if (details.error) throw new Error(`Lỗi tải chi tiết dịch vụ: ${details.error.message}`);
    if (tasks.error) throw new Error(`Lỗi tải chi phí nhân sự: ${tasks.error.message}`);
    if (prints.error) throw new Error(`Lỗi tải chi phí in ấn: ${prints.error.message}`);
    if (expenses.error) throw new Error(`Lỗi tải chi phí khác: ${expenses.error.message}`);

    const subtotal = asNumber(contract.total_amount);

    const detailData: ContractProfitDetailData = {
      contract: {
        id: contract.id,
        total_amount: asNumber(contract.total_amount),
        discount: asNumber((contract as RpcRow).discount_amount),
        subtotal,
        contract_code: asString(contract.contract_code),
        status: asString(contract.status),
        created_at: asString(contract.created_at),
        customer_name: relationText(contract.customers as unknown, "full_name") || "Khách vãng lai",
      },
      details: details.data.map((d: Record<string, unknown>) => ({
        id: d.id as string,
        service_name: asString(d.service_name),
        quantity: asNumber(d.quantity) || 1,
        unit_price: asNumber(d.unit_price),
        total_amount: asNumber(d.total_amount),
        item_type: asString(d.item_type) || null,
        addon_category: asString(d.addon_category) || null,
      })),
      tasks: tasks.data.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        work_type: asString(t.work_type),
        cost: asNumber(t.cost),
        employees: t.employees ? { full_name: relationText(t.employees as unknown, "full_name") as string } : null,
      })),
      orders: prints.data.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        item_name: asString(p.item_name),
        quantity: asNumber(p.quantity) || 1,
        cost: asNumber(p.cost),
        payment_status: asString(p.payment_status),
      })),
      expenses: expenses.data.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        description: asString(e.description),
        amount: asNumber(e.amount),
        transaction_date: asString(e.expense_date) || undefined,
      })),
    };

    return detailData;
  });
}
