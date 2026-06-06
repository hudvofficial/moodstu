"use server";

import { withFinanceRead } from "@/lib/auth_utils";
import { asNumber, asString, isMissingRpcError } from "@/lib/finance-utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getReportRevenueLabel,
  getReportServiceLabel,
} from "@/lib/report-labels";
import { enumerateMonthsInRange, getReportRange } from "@/lib/report-period";
import { reportFiltersSchema } from "@/lib/validations/reports.schema";
import { BATCH_CHUNK_SIZE, calculatePercentage } from "@/lib/finance-constants";
import type { FixedCostItem } from "@/types/finance-operations";
import type { ReportFiltersInput, ReportsSnapshot } from "@/types/reports";

type ContractItemRow = {
  total_amount: number | null;
  is_addon: boolean | null;
};

type TaskRow = { contract_id: string; cost: number | null };
type PrintRow = { contract_id: string; total_amount: number | null };
type ExpenseRow = { contract_id: string | null; amount: number | null; description: string | null };
type InventoryRow = { contract_id?: string | null; quantity: number | null; unit_cost: number | null; total_cost: number | null; source_type?: string | null };

type ContractRow = {
  id: string;
  status: string | null;
  total_amount: number | null;
  discount_amount: number | null;
  service_type: string | null;
  contract_items: ContractItemRow[] | null;
};

type SalaryMonthRow = {
  month: number | null;
  year: number | null;
  total_salary: number | null;
};

function isCompletedStatus(status: string | null) {
  return status === "hoan_thanh" || status === "completed";
}

function buildMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function sumProratedSalaries(
  rows: SalaryMonthRow[],
  startDate: string,
  endDate: string,
) {
  const ratios = new Map(
    enumerateMonthsInRange(startDate, endDate).map((slice) => [
      buildMonthKey(slice.year, slice.month),
      slice.ratio,
    ]),
  );

  return rows.reduce((sum: number, row: SalaryMonthRow) => {
    const year = row.year || 0;
    const month = row.month || 0;
    const ratio = ratios.get(buildMonthKey(year, month)) || 0;
    return sum + asNumber(row.total_salary) * ratio;
  }, 0);
}

function sumProratedFixedCosts(
  items: FixedCostItem[],
  startDate: string,
  endDate: string,
) {
  const rangeStart = new Date(`${startDate}T00:00:00`);
  const rangeEnd = new Date(`${endDate}T00:00:00`);

  return enumerateMonthsInRange(startDate, endDate).reduce((sum, slice) => {
    const monthStart = new Date(Date.UTC(slice.year, slice.month - 1, 1));
    const monthEnd = new Date(Date.UTC(slice.year, slice.month, 0));

    const monthTotal = items.reduce((monthSum, item) => {
      if (!item.monthly_amount) return monthSum;

      const activeFrom = item.start_date
        ? new Date(`${item.start_date}T00:00:00`)
        : rangeStart;
      const activeTo = item.end_date
        ? new Date(`${item.end_date}T00:00:00`)
        : rangeEnd;

      if (activeFrom > monthEnd || activeTo < monthStart) {
        return monthSum;
      }

      return monthSum + item.monthly_amount;
    }, 0);

    return sum + monthTotal * slice.ratio;
  }, 0);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeReportsSnapshotPayload(
  payload: unknown,
  range: ReportsSnapshot["range"],
): ReportsSnapshot {
  const root = asRecord(payload);
  const summary = asRecord(root.summary);
  const cashflowSummary = asRecord(root.cashflowSummary);
  const serviceDistribution = Array.isArray(root.serviceDistribution)
    ? root.serviceDistribution
    : [];
  const revenueBreakdown = Array.isArray(root.revenueBreakdown)
    ? root.revenueBreakdown
    : [];

  return {
    range,
    summary: {
      totalRevenue: asNumber(summary.totalRevenue),
      totalCost: asNumber(summary.totalCost),
      directCost: asNumber(summary.directCost),
      inventoryCost: asNumber(summary.inventoryCost),
      operatingCost: asNumber(summary.operatingCost),
      salaryCost: asNumber(summary.salaryCost),
      fixedCost: asNumber(summary.fixedCost),
      netProfit: asNumber(summary.netProfit),
      profitMargin: asNumber(summary.profitMargin),
      totalContracts: asNumber(summary.totalContracts),
      completedContracts: asNumber(summary.completedContracts),
      avgContractValue: asNumber(summary.avgContractValue),
      totalDiscount: asNumber(summary.totalDiscount),
      packageRevenue: asNumber(summary.packageRevenue),
      addonRevenue: asNumber(summary.addonRevenue),
      addonCount: asNumber(summary.addonCount),
      addonPercentage: asNumber(summary.addonPercentage),
    },
    serviceDistribution: serviceDistribution.map((item) => {
      const row = asRecord(item);
      return {
        name: getReportServiceLabel(asString(row.name, "khac")),
        value: asNumber(row.value),
        revenue: asNumber(row.revenue),
      };
    }),
    revenueBreakdown: revenueBreakdown.map((item) => {
      const row = asRecord(item);
      return {
        label: getReportRevenueLabel(asString(row.label)),
        amount: asNumber(row.amount),
        percentage: asNumber(row.percentage),
      };
    }),
    cashflowSummary: {
      totalInflow: asNumber(cashflowSummary.totalInflow),
      totalOutflow: asNumber(cashflowSummary.totalOutflow),
      salaryCost: asNumber(cashflowSummary.salaryCost),
      fixedCost: asNumber(cashflowSummary.fixedCost),
      operatingNet: asNumber(cashflowSummary.operatingNet),
      netAfterOverhead: asNumber(cashflowSummary.netAfterOverhead),
    },
  };
}

export async function getReportsSnapshot(filters: ReportFiltersInput) {
  return withFinanceRead(async (supabase) => {
    const safeFilters = reportFiltersSchema.parse(filters);
    const range = getReportRange(safeFilters);

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "finance_reports_snapshot",
      {
        p_start_date: range.startDate,
        p_end_date: range.endDate,
      },
    );

    if (!rpcError) {
      return normalizeReportsSnapshotPayload(rpcData, range);
    }
    if (!isMissingRpcError(rpcError) || process.env.NODE_ENV === "production") {
      throw new Error(`Loi tai bao cao: ${rpcError.message}`);
    }
    return calculateFallbackSnapshot(supabase, range);
  });
}

async function calculateFallbackSnapshot(
  supabase: SupabaseClient,
  range: ReturnType<typeof getReportRange>,
): Promise<ReportsSnapshot> {
  const monthSlices = enumerateMonthsInRange(range.startDate, range.endDate);
  const reportYears = Array.from(
    new Set(monthSlices.map((slice) => slice.year)),
  );

  const [
    contractsResult,
    fixedCostsResult,
    salariesResult,
    paymentsResult,
    receiptsResult,
    operationsResult,
    retailInventoryResult,
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, status, total_amount, discount_amount, service_type, contract_items(total_amount, is_addon)",
      )
      .is("deleted_at", null)
      .gte("contract_date", range.startDate)
      .lte("contract_date", range.endDate),
    supabase
      .from("fixed_costs")
      .select(
        "id, cost_code, cost_name, cost_type, monthly_amount, deposit_amount, start_date, end_date, description, updated_at",
      )
      .is("deleted_at", null),
    supabase
      .from("monthly_salaries")
      .select("month, year, total_salary")
      .in("year", reportYears),
    supabase
      .from("payments")
      .select("amount")
      .is("deleted_at", null)
      .gte("payment_date", range.startDate)
      .lte("payment_date", range.endDate),
    supabase
      .from("receipts")
      .select("receipt_amount")
      .is("deleted_at", null)
      .is("contract_id", null)
      .gte("receipt_date", range.startDate)
      .lte("receipt_date", range.endDate),
    supabase
      .from("expenses")
      .select("contract_id, amount, description")
      .is("deleted_at", null)
      .gte("expense_date", range.startDate)
      .lte("expense_date", range.endDate),
    supabase
      .from("inventory_transactions")
      .select(
        "quantity, unit_cost, total_cost, source_type, receipt_id, receipts(receipt_date)",
      )
      .eq("transaction_type", "stock_out")
      .eq("source_type", "retail_sale")
      .gte("created_at", `${range.startDate}T00:00:00`)
      .lte("created_at", `${range.endDate}T23:59:59`),
  ]);

  const firstError =
    contractsResult.error ||
    fixedCostsResult.error ||
    salariesResult.error ||
    paymentsResult.error ||
    receiptsResult.error ||
    operationsResult.error ||
    retailInventoryResult.error;

  if (firstError) {
    throw new Error(`Loi tai bao cao: ${firstError.message}`);
  }

  const contracts = (contractsResult.data || []) as ContractRow[];
  const contractIds = contracts.map((contract) => contract.id);

  const allTasks: TaskRow[] = [];
  const allPrints: PrintRow[] = [];
  const allContractExpenses: ExpenseRow[] = [];
  const allContractInventory: InventoryRow[] = [];

  if (contractIds.length > 0) {
    const contractIdChunks = [];
    for (let i = 0; i < contractIds.length; i += BATCH_CHUNK_SIZE) {
      contractIdChunks.push(contractIds.slice(i, i + BATCH_CHUNK_SIZE));
    }

    for (const chunk of contractIdChunks) {
      const [tasksRes, printsRes, contractExpensesRes, contractInventoryRes] = await Promise.all([
        supabase
          .from("work_tasks")
          .select("contract_id, cost")
          .in("contract_id", chunk),
        supabase
          .from("printing_orders")
          .select("contract_id, total_amount")
          .is("deleted_at", null)
          .in("contract_id", chunk),
        supabase
          .from("expenses")
          .select("contract_id, amount, description")
          .is("deleted_at", null)
          .in("contract_id", chunk),
        supabase
          .from("inventory_transactions")
          .select("contract_id, quantity, unit_cost, total_cost, source_type")
          .eq("transaction_type", "stock_out")
          .in("source_type", ["contract_fulfillment", "contract_addon_sale"])
          .in("contract_id", chunk),
      ]);

      const directError =
        tasksRes.error ||
        printsRes.error ||
        contractExpensesRes.error ||
        contractInventoryRes.error;
      
      if (directError) {
        throw new Error(`Loi tai chi phi hop dong: ${directError.message}`);
      }

      allTasks.push(...(tasksRes.data || []));
      allPrints.push(...(printsRes.data || []));
      allContractExpenses.push(...(contractExpensesRes.data || []));
      allContractInventory.push(...(contractInventoryRes.data || []));
    }
  }

  const tasksResult = { data: allTasks, error: null };
  const printsResult = { data: allPrints, error: null };
  const contractExpensesResult = { data: allContractExpenses, error: null };
  const contractInventoryResult = { data: allContractInventory, error: null };

  const paymentRevenue = (paymentsResult.data || []).reduce(
    (sum: number, row: { amount: number | null }) => sum + asNumber(row.amount),
    0,
  );
  const standaloneReceiptRevenue = (receiptsResult.data || []).reduce(
    (sum: number, row: { receipt_amount: number | null }) => sum + asNumber(row.receipt_amount),
    0,
  );
  const contractRevenue = contracts.reduce(
    (sum: number, contract: ContractRow) => sum + asNumber(contract.total_amount),
    0,
  );
  const cashInflow = paymentRevenue + standaloneReceiptRevenue;
  const reportRevenue = contractRevenue + standaloneReceiptRevenue;
  const totalDiscount = contracts.reduce(
    (sum: number, contract: ContractRow) => sum + asNumber(contract.discount_amount),
    0,
  );
  const completedContracts = contracts.filter((contract) =>
    isCompletedStatus(contract.status),
  ).length;

  const serviceMap = new Map<string, { value: number; revenue: number }>();
  let addonRevenue = 0;
  let addonCount = 0;

  for (const contract of contracts) {
    const serviceName = getReportServiceLabel(
      asString(contract.service_type, "khac"),
    );
    const current = serviceMap.get(serviceName) || { value: 0, revenue: 0 };
    current.value += 1;
    current.revenue += asNumber(contract.total_amount);
    serviceMap.set(serviceName, current);

    for (const item of contract.contract_items || []) {
      if (!item.is_addon) continue;
      addonRevenue += asNumber(item.total_amount);
      addonCount += 1;
    }
  }

  const packageRevenue = Math.max(0, contractRevenue - addonRevenue);
  const serviceDistribution = Array.from(serviceMap.entries())
    .map(([name, item]) => ({ name, value: item.value, revenue: item.revenue }))
    .sort(
      (left, right) => right.revenue - left.revenue || right.value - left.value,
    );

  const taskCost = (tasksResult.data as TaskRow[]).reduce(
    (sum: number, row: TaskRow) => sum + asNumber(row.cost),
    0,
  );
  const printCost = (printsResult.data as PrintRow[]).reduce(
    (sum: number, row: PrintRow) => sum + asNumber(row.total_amount),
    0,
  );
  const contractExpenseCost = (contractExpensesResult.data as ExpenseRow[]).reduce(
    (sum: number, row: ExpenseRow) => {
      return asString(row.description).startsWith("[Auto-Print]")
        ? sum
        : sum + asNumber(row.amount);
    },
    0,
  );
  const inventoryCost =
    (contractInventoryResult.data as InventoryRow[]).reduce(
      (sum: number, row: InventoryRow) =>
        sum + asNumber(row.total_cost || asNumber(row.quantity) * asNumber(row.unit_cost)),
      0,
    ) +
    (retailInventoryResult.data || []).reduce(
      (sum: number, row: InventoryRow) =>
        sum + asNumber(row.total_cost || asNumber(row.quantity) * asNumber(row.unit_cost)),
      0,
    );
  const directCost = taskCost + printCost + contractExpenseCost + inventoryCost;

  const operatingCost = (operationsResult.data as ExpenseRow[]).reduce(
    (sum: number, row: ExpenseRow) => {
      return row.contract_id ? sum : sum + asNumber(row.amount);
    },
    0,
  );
  const operatingOutflow = (operationsResult.data as ExpenseRow[]).reduce(
    (sum: number, row: ExpenseRow) => sum + asNumber(row.amount),
    0,
  );

  const salaryCost = sumProratedSalaries(
    (salariesResult.data || []) as SalaryMonthRow[],
    range.startDate,
    range.endDate,
  );
  const fixedCost = sumProratedFixedCosts(
    (fixedCostsResult.data || []) as FixedCostItem[],
    range.startDate,
    range.endDate,
  );

  const totalCost = directCost + operatingCost + salaryCost + fixedCost;
  const totalOutflow = operatingOutflow + salaryCost + fixedCost;
  const netProfit = reportRevenue - totalCost;

  return {
    range,
    summary: {
      totalRevenue: reportRevenue,
      totalCost,
      directCost,
      inventoryCost,
      operatingCost,
      salaryCost,
      fixedCost,
      netProfit,
      profitMargin: calculatePercentage(netProfit, reportRevenue),
      totalContracts: contracts.length,
      completedContracts,
      avgContractValue:
        contracts.length > 0 ? contractRevenue / contracts.length : 0,
      totalDiscount,
      packageRevenue,
      addonRevenue,
      addonCount,
      addonPercentage: calculatePercentage(addonRevenue, contractRevenue),
    },
    serviceDistribution,
    revenueBreakdown: [
      {
        label: getReportRevenueLabel("contract_revenue"),
        amount: contractRevenue,
        percentage: calculatePercentage(contractRevenue, reportRevenue),
      },
      {
        label: getReportRevenueLabel("other_revenue"),
        amount: standaloneReceiptRevenue,
        percentage: calculatePercentage(standaloneReceiptRevenue, reportRevenue),
      },
    ],
    cashflowSummary: {
      totalInflow: cashInflow,
      totalOutflow,
      salaryCost,
      fixedCost,
      operatingNet: cashInflow - operatingOutflow,
      netAfterOverhead: cashInflow - totalOutflow,
    },
  } satisfies ReportsSnapshot;
}
