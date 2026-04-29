"use server";

import { withFinanceRead } from "@/lib/auth_utils";
import { asNumber, asString, isMissingRpcError } from "@/lib/finance-utils";
import { enumerateMonthsInRange, getReportRange } from "@/lib/report-period";
import { reportFiltersSchema } from "@/lib/validations/reports.schema";
import type { FixedCostItem } from "@/types/finance-operations";
import type { ReportFiltersInput, ReportsSnapshot } from "@/types/reports";

type ContractItemRow = {
  total_amount: number | null;
  is_addon: boolean | null;
};

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

function sumProratedSalaries(rows: SalaryMonthRow[], startDate: string, endDate: string) {
  const ratios = new Map(
    enumerateMonthsInRange(startDate, endDate).map((slice) => [buildMonthKey(slice.year, slice.month), slice.ratio]),
  );

  return rows.reduce((sum, row) => {
    const year = row.year || 0;
    const month = row.month || 0;
    const ratio = ratios.get(buildMonthKey(year, month)) || 0;
    return sum + asNumber(row.total_salary) * ratio;
  }, 0);
}

function sumProratedFixedCosts(items: FixedCostItem[], startDate: string, endDate: string) {
  const rangeStart = new Date(`${startDate}T00:00:00`);
  const rangeEnd = new Date(`${endDate}T00:00:00`);

  return enumerateMonthsInRange(startDate, endDate).reduce((sum, slice) => {
    const monthStart = new Date(Date.UTC(slice.year, slice.month - 1, 1));
    const monthEnd = new Date(Date.UTC(slice.year, slice.month, 0));

    const monthTotal = items.reduce((monthSum, item) => {
      if (!item.monthly_amount) return monthSum;

      const activeFrom = item.start_date ? new Date(`${item.start_date}T00:00:00`) : rangeStart;
      const activeTo = item.end_date ? new Date(`${item.end_date}T00:00:00`) : rangeEnd;

      if (activeFrom > monthEnd || activeTo < monthStart) {
        return monthSum;
      }

      return monthSum + item.monthly_amount;
    }, 0);

    return sum + monthTotal * slice.ratio;
  }, 0);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeReportsSnapshotPayload(payload: unknown, range: ReportsSnapshot["range"]): ReportsSnapshot {
  const root = asRecord(payload);
  const summary = asRecord(root.summary);
  const cashflowSummary = asRecord(root.cashflowSummary);
  const serviceDistribution = Array.isArray(root.serviceDistribution) ? root.serviceDistribution : [];
  const revenueBreakdown = Array.isArray(root.revenueBreakdown) ? root.revenueBreakdown : [];

  return {
    range,
    summary: {
      totalRevenue: asNumber(summary.totalRevenue),
      totalCost: asNumber(summary.totalCost),
      directCost: asNumber(summary.directCost),
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
        name: asString(row.name, "Khac"),
        value: asNumber(row.value),
        revenue: asNumber(row.revenue),
      };
    }),
    revenueBreakdown: revenueBreakdown.map((item) => {
      const row = asRecord(item);
      return {
        label: asString(row.label),
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

    const { data: rpcData, error: rpcError } = await supabase.rpc("finance_reports_snapshot", {
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    });

    if (!rpcError) {
      return normalizeReportsSnapshotPayload(rpcData, range);
    }
    if (!isMissingRpcError(rpcError) || process.env.NODE_ENV === "production") {
      throw new Error(`Loi tai bao cao: ${rpcError.message}`);
    }

    const monthSlices = enumerateMonthsInRange(range.startDate, range.endDate);
    const reportYears = Array.from(new Set(monthSlices.map((slice) => slice.year)));

    const [contractsResult, fixedCostsResult, salariesResult, paymentsResult, receiptsResult, operationsResult] = await Promise.all([
      supabase
        .from("contracts")
        .select("id, status, total_amount, discount_amount, service_type, contract_items(total_amount, is_addon)")
        .is("deleted_at", null)
        .gte("contract_date", range.startDate)
        .lte("contract_date", range.endDate),
      supabase
        .from("fixed_costs")
        .select("id, cost_code, cost_name, cost_type, monthly_amount, deposit_amount, start_date, end_date, description, updated_at")
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
    ]);

    const firstError =
      contractsResult.error ||
      fixedCostsResult.error ||
      salariesResult.error ||
      paymentsResult.error ||
      receiptsResult.error ||
      operationsResult.error;

    if (firstError) {
      throw new Error(`Loi tai bao cao: ${firstError.message}`);
    }

    const contracts = (contractsResult.data || []) as ContractRow[];
    const contractIds = contracts.map((contract) => contract.id);

    const [tasksResult, printsResult, contractExpensesResult] = contractIds.length > 0
      ? await Promise.all([
          supabase.from("work_tasks").select("contract_id, cost").in("contract_id", contractIds),
          supabase.from("printing_orders").select("contract_id, total_amount").is("deleted_at", null).in("contract_id", contractIds),
          supabase
            .from("expenses")
            .select("contract_id, amount, description")
            .is("deleted_at", null)
            .in("contract_id", contractIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

    const directError = tasksResult.error || printsResult.error || contractExpensesResult.error;
    if (directError) {
      throw new Error(`Loi tai chi phi hop dong: ${directError.message}`);
    }

    const paymentRevenue = (paymentsResult.data || []).reduce((sum, row) => sum + asNumber(row.amount), 0);
    const standaloneReceiptRevenue = (receiptsResult.data || []).reduce((sum, row) => sum + asNumber(row.receipt_amount), 0);
    const contractRevenue = contracts.reduce((sum, contract) => sum + asNumber(contract.total_amount), 0);
    const cashInflow = paymentRevenue + standaloneReceiptRevenue;
    const reportRevenue = contractRevenue + standaloneReceiptRevenue;
    const totalDiscount = contracts.reduce((sum, contract) => sum + asNumber(contract.discount_amount), 0);
    const completedContracts = contracts.filter((contract) => isCompletedStatus(contract.status)).length;

    const serviceMap = new Map<string, { value: number; revenue: number }>();
    let addonRevenue = 0;
    let addonCount = 0;

    for (const contract of contracts) {
      const serviceName = asString(contract.service_type, "Khac") || "Khac";
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
      .sort((left, right) => right.revenue - left.revenue || right.value - left.value);

    const taskCost = (tasksResult.data || []).reduce((sum, row) => sum + asNumber(row.cost), 0);
    const printCost = (printsResult.data || []).reduce((sum, row) => sum + asNumber(row.total_amount), 0);
    const contractExpenseCost = (contractExpensesResult.data || []).reduce((sum, row) => {
      return asString(row.description).startsWith("[Auto-Print]") ? sum : sum + asNumber(row.amount);
    }, 0);
    const directCost = taskCost + printCost + contractExpenseCost;

    const operatingCost = (operationsResult.data || []).reduce((sum, row) => {
      return row.contract_id ? sum : sum + asNumber(row.amount);
    }, 0);
    const operatingOutflow = (operationsResult.data || []).reduce((sum, row) => sum + asNumber(row.amount), 0);

    const salaryCost = sumProratedSalaries((salariesResult.data || []) as SalaryMonthRow[], range.startDate, range.endDate);
    const fixedCost = sumProratedFixedCosts((fixedCostsResult.data || []) as FixedCostItem[], range.startDate, range.endDate);

    const totalCost = directCost + operatingCost + salaryCost + fixedCost;
    const totalOutflow = operatingOutflow + salaryCost + fixedCost;
    const netProfit = reportRevenue - totalCost;

    return {
      range,
      summary: {
        totalRevenue: reportRevenue,
        totalCost,
        directCost,
        operatingCost,
        salaryCost,
        fixedCost,
        netProfit,
        profitMargin: reportRevenue > 0 ? Math.round((netProfit / reportRevenue) * 1000) / 10 : 0,
        totalContracts: contracts.length,
        completedContracts,
        avgContractValue: contracts.length > 0 ? contractRevenue / contracts.length : 0,
        totalDiscount,
        packageRevenue,
        addonRevenue,
        addonCount,
        addonPercentage: contractRevenue > 0 ? Math.round((addonRevenue / contractRevenue) * 1000) / 10 : 0,
      },
      serviceDistribution,
      revenueBreakdown: [
        {
          label: "Doanh thu hop dong",
          amount: contractRevenue,
          percentage: reportRevenue > 0 ? Math.round((contractRevenue / reportRevenue) * 1000) / 10 : 0,
        },
        {
          label: "Thu khac",
          amount: standaloneReceiptRevenue,
          percentage: reportRevenue > 0 ? Math.round((standaloneReceiptRevenue / reportRevenue) * 1000) / 10 : 0,
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
  });
}
