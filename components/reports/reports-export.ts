"use client";

import {
  fetchLedger,
  getContractProfitReport,
  getPendingCollections,
} from "@/app/actions/finance-dashboard-queries";
import { financeStatusLabel, formatFinanceDate } from "@/components/finance/finance-format";
import { downloadExcelXml, type ExcelWorksheet } from "@/lib/excel-xml";
import { getReportRange } from "@/lib/report-period";
import type { ActionResult } from "@/types/action-result";
import type {
  ContractProfitRow,
  FinanceContractListItem,
  LedgerItem,
  PaginatedResult,
} from "@/types/finance-dashboard";
import type {
  CashflowTimelinePoint,
  ReportFiltersInput,
  ReportsSnapshot,
} from "@/types/reports";
import type { DebtStats } from "@/app/actions/finance-operations-queries";

const EXPORT_PAGE_SIZE = 200;
const PENDING_LIMIT = 200;

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>,
) {
  const rows: T[] = [];
  let page = 1;

  while (true) {
    const current = await fetchPage(page);
    rows.push(...current.items);

    if (rows.length >= current.total || current.items.length < current.pageSize) {
      return rows;
    }

    page += 1;
  }
}

function createFileSlug(label: string) {
  return (
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "bao-cao"
  );
}

function buildOverviewSheet(snapshot: ReportsSnapshot): ExcelWorksheet {
  return {
    name: "Tổng quan",
    rows: [
      ["Báo cáo tài chính", snapshot.range.label],
      ["Khoảng ngày", `${snapshot.range.startDate} đến ${snapshot.range.endDate}`],
      [],
      ["Chỉ số", "Giá trị"],
      ["Doanh thu", snapshot.summary.totalRevenue],
      ["Tổng chi", snapshot.summary.totalCost],
      ["Chi trực tiếp", snapshot.summary.directCost],
      ["Chi vận hành", snapshot.summary.operatingCost],
      ["Lương", snapshot.summary.salaryCost],
      ["Chi phí cố định", snapshot.summary.fixedCost],
      ["Lợi nhuận ròng", snapshot.summary.netProfit],
      ["Biên lợi nhuận (%)", snapshot.summary.profitMargin],
      ["Tổng hợp đồng", snapshot.summary.totalContracts],
      ["Hoàn thành", snapshot.summary.completedContracts],
      ["Giá trị TB / HĐ", snapshot.summary.avgContractValue],
      ["Khuyến mãi", snapshot.summary.totalDiscount],
      ["Doanh thu gói", snapshot.summary.packageRevenue],
      ["Doanh thu phát sinh", snapshot.summary.addonRevenue],
      ["Số lượng phát sinh", snapshot.summary.addonCount],
      ["Tỷ trọng phát sinh (%)", snapshot.summary.addonPercentage],
      [],
      ["Nguồn doanh thu", "Số tiền", "Tỷ trọng (%)"],
      ...snapshot.revenueBreakdown.map((item) => [item.label, item.amount, item.percentage]),
      [],
      ["Phân bổ dịch vụ", "Số HĐ", "Doanh thu"],
      ...snapshot.serviceDistribution.map((item) => [item.name, item.value, item.revenue]),
    ],
  };
}

function buildCashflowSheet(
  snapshot: ReportsSnapshot,
  timeline: CashflowTimelinePoint[],
): ExcelWorksheet {
  return {
    name: "Dòng tiền",
    rows: [
      ["Kỳ báo cáo", snapshot.range.label],
      ["Tiền vào", snapshot.cashflowSummary.totalInflow],
      ["Tiền ra", snapshot.cashflowSummary.totalOutflow],
      ["Lương", snapshot.cashflowSummary.salaryCost],
      ["Chi phí cố định", snapshot.cashflowSummary.fixedCost],
      ["Ròng vận hành", snapshot.cashflowSummary.operatingNet],
      ["Ròng sau overhead", snapshot.cashflowSummary.netAfterOverhead],
      [],
      ["Ngày", "Tiền vào", "Tiền ra", "Chênh lệch"],
      ...timeline.map((item) => [item.date, item.inflow, item.outflow, item.inflow - item.outflow]),
    ],
  };
}

function buildDebtSheet(
  debtStats: DebtStats,
  pendingRows: FinanceContractListItem[],
): ExcelWorksheet {
  return {
    name: "Công nợ",
    rows: [
      ["Ghi chú", "Snapshot công nợ hiện tại, không phụ thuộc bộ lọc kỳ báo cáo."],
      [],
      ["Chỉ số", "Giá trị"],
      ["Phải thu", debtStats.receivable],
      ["Phải trả", debtStats.payable],
      ["Nợ ròng", debtStats.net_debt],
      ["Quá hạn", debtStats.overdue],
      [],
      ["Bucket tuổi nợ", "Giá trị"],
      ["Chưa đến hạn", debtStats.aging.not_due],
      ["1-30 ngày", debtStats.aging.days_1_30],
      ["31-60 ngày", debtStats.aging.days_31_60],
      ["61-90 ngày", debtStats.aging.days_61_90],
      ["> 90 ngày", debtStats.aging.over_90],
      [],
      ["Mã HĐ", "Khách hàng", "Ngày hợp đồng", "Còn phải thu", "Trạng thái"],
      ...pendingRows.map((item) => [
        item.contract_code || "",
        item.customers?.full_name || "Khách vãng lai",
        item.contract_date ? formatFinanceDate(item.contract_date) : "",
        Number(item.remaining_amount) || 0,
        financeStatusLabel(item.status),
      ]),
    ],
  };
}

function buildProfitSheet(rows: ContractProfitRow[]): ExcelWorksheet {
  return {
    name: "Lợi nhuận",
    rows: [
      [
        "Mã HĐ",
        "Khách hàng",
        "Ngày hợp đồng",
        "Trạng thái",
        "Doanh thu",
        "Doanh thu gói",
        "Phát sinh",
        "Đã thu",
        "Còn phải thu",
        "Chi phí",
        "Lợi nhuận",
        "Biên LN (%)",
      ],
      ...rows.map((item) => [
        item.contractCode || "",
        item.customerName || "Khách vãng lai",
        item.contractDate ? formatFinanceDate(item.contractDate) : "",
        financeStatusLabel(item.status),
        item.totalAmount,
        item.packageRevenue,
        item.addonRevenue,
        item.paidAmount,
        item.remainingAmount,
        item.totalCost,
        item.profit,
        item.profitMargin,
      ]),
    ],
  };
}

function buildLedgerSheet(rows: LedgerItem[]): ExcelWorksheet {
  return {
    name: "Sổ cái",
    rows: [
      [
        "Ngày",
        "Nguồn",
        "Chiều",
        "Mã giao dịch",
        "Khách hàng",
        "Danh mục",
        "Phương thức",
        "Trạng thái",
        "Số tiền",
        "Mô tả",
      ],
      ...rows.map((item) => [
        formatFinanceDate(item.transactionDate),
        item.sourceTable,
        item.direction === "in" ? "Tiền vào" : "Tiền ra",
        item.code || "",
        item.customerName || "",
        item.categoryName || "",
        item.paymentMethod || "",
        financeStatusLabel(item.status),
        item.amount,
        item.description || "",
      ]),
    ],
  };
}

export async function exportReportsWorkbook(params: {
  filters: ReportFiltersInput;
  snapshot: ReportsSnapshot;
  debtStats: DebtStats;
  cashflow: CashflowTimelinePoint[];
  pendingFallback: FinanceContractListItem[];
}) {
  const range = getReportRange(params.filters);

  const [profitRows, ledgerRows, pendingRows] = await Promise.all([
    collectAllPages((page) =>
      requireData(
        getContractProfitReport({
          status: "all",
          fromDate: range.startDate,
          toDate: range.endDate,
          page,
          pageSize: EXPORT_PAGE_SIZE,
        }),
      ),
    ),
    collectAllPages((page) =>
      requireData(
        fetchLedger({
          page,
          pageSize: EXPORT_PAGE_SIZE,
          fromDate: range.startDate,
          toDate: range.endDate,
          type: "all",
        }),
      ),
    ),
    requireData(getPendingCollections(PENDING_LIMIT)).catch(() => params.pendingFallback),
  ]);

  const sheets = [
    buildOverviewSheet(params.snapshot),
    buildCashflowSheet(params.snapshot, params.cashflow),
    buildDebtSheet(params.debtStats, pendingRows),
    buildProfitSheet(profitRows),
    buildLedgerSheet(ledgerRows),
  ];

  const filename = `bao-cao-${createFileSlug(range.label)}`;
  downloadExcelXml(filename, sheets);

  return {
    filename: `${filename}.xls`,
    ledgerCount: ledgerRows.length,
    pendingCount: pendingRows.length,
    profitCount: profitRows.length,
  };
}
