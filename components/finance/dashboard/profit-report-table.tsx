"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronRight, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { getContractProfitReport } from "@/app/actions/finance-dashboard-queries";
import { formatFinanceDate, formatVnd, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { ContractProfitDetailDrawer } from "@/components/finance/dashboard/profit-detail-drawer";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { Pagination } from "@/components/ui/pagination";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, useSWR } from "@/lib/swr";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/types/action-result";
import type { ContractProfitRow, PaginatedResult } from "@/types/finance-dashboard";

interface ProfitReportTableProps {
  initialData?: PaginatedResult<ContractProfitRow>;
  initialStatus?: string;
  initialFromDate?: string;
  initialToDate?: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "draft", label: "Nháp" },
  { value: "dang_thuc_hien", label: "Đang thực hiện" },
  { value: "hoan_thanh", label: "Hoàn thành" },
  { value: "da_huy", label: "Đã hủy" },
];

const EMPTY_RESULT: PaginatedResult<ContractProfitRow> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
};

const HYDRATED_FALLBACK_OPTIONS = {
  revalidateOnMount: false,
  revalidateIfStale: false,
} as const;

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function getMarginVariant(value: number): BadgeVariant {
  if (value >= 30) return "success";
  if (value >= 15) return "primary";
  if (value >= 0) return "warning";
  return "error";
}

function getCollectionVariant(row: ContractProfitRow): BadgeVariant {
  if (row.remainingAmount <= 0) return "success";
  if (row.paidAmount > 0) return "warning";
  return "error";
}

function getCollectionLabel(row: ContractProfitRow): string {
  if (row.remainingAmount <= 0) return "Đã thu đủ";
  if (row.paidAmount > 0) return "Cần thu thêm";
  return "Chưa thu";
}

function formatPercent(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function ProfitDesktopTable({
  items,
  onSelect,
}: {
  items: ContractProfitRow[];
  onSelect: (contractId: string) => void;
}) {
  return (
    <TableWrapper containerClassName="hidden lg:block">
      <THead>
        <TR>
          <TH>Hợp đồng</TH>
          <TH>Khách hàng</TH>
          <TH>Trạng thái</TH>
          <TH className="text-right">Doanh thu</TH>
          <TH className="text-right">Chi phí</TH>
          <TH className="text-right">Lợi nhuận</TH>
          <TH>Biên LN</TH>
          <TH className="text-right">Thu tiền</TH>
        </TR>
      </THead>
      <TBody>
        {items.length === 0 ? (
          <TR>
            <TD colSpan={8} className="py-8 text-center text-text-muted">
              Chưa có hợp đồng nào khớp bộ lọc hiện tại.
            </TD>
          </TR>
        ) : (
          items.map((item) => (
            <TR key={item.id} onClick={() => onSelect(item.id)}>
              <TD>
                <div className="flex flex-col">
                  <span className="font-semibold text-text-primary">{item.contractCode || "Không có mã"}</span>
                  <span className="text-caption text-text-muted">{formatFinanceDate(item.contractDate)}</span>
                </div>
              </TD>
              <TD>
                <div className="max-w-44 truncate font-medium text-text-primary">{item.customerName || "Khách vãng lai"}</div>
              </TD>
              <TD>
                <Badge variant={financeStatusVariant(item.status)}>{financeStatusLabel(item.status)}</Badge>
              </TD>
              <TD className="text-right">
                <div className="flex flex-col items-end">
                  <span className="tabular-nums font-semibold text-text-primary">{formatVnd(item.totalAmount)}</span>
                  <span className="text-caption text-text-muted">
                    Gói {formatVnd(item.packageRevenue)} · PS {formatVnd(item.addonRevenue)}
                  </span>
                </div>
              </TD>
              <TD className="text-right">
                <div className="flex flex-col items-end">
                  <span className="tabular-nums font-semibold text-text-primary">{formatVnd(item.totalCost)}</span>
                  <span className="text-caption text-text-muted">
                    Lương {formatVnd(item.taskCost)} · In {formatVnd(item.printCost)}
                  </span>
                </div>
              </TD>
              <TD className="text-right">
                <div className="flex flex-col items-end">
                  <span className={cn("tabular-nums font-bold", item.profit >= 0 ? "text-success" : "text-error")}>
                    {item.profit >= 0 ? "+" : ""}
                    {formatVnd(item.profit)}
                  </span>
                  <span className="text-caption text-text-muted">Đã thu {formatVnd(item.paidAmount)}</span>
                </div>
              </TD>
              <TD>
                <Badge variant={getMarginVariant(item.profitMargin)}>{formatPercent(item.profitMargin)}</Badge>
              </TD>
              <TD className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={getCollectionVariant(item)}>{getCollectionLabel(item)}</Badge>
                  <span className="tabular-nums text-caption text-text-muted">Còn {formatVnd(item.remainingAmount)}</span>
                </div>
              </TD>
            </TR>
          ))
        )}
      </TBody>
    </TableWrapper>
  );
}

function ProfitMobileList({
  items,
  onSelect,
}: {
  items: ContractProfitRow[];
  onSelect: (contractId: string) => void;
}) {
  return (
    <div className="space-y-3 lg:hidden">
      {items.length === 0 ? (
        <div className="card-base p-5 text-center text-text-muted">Chưa có hợp đồng nào khớp bộ lọc hiện tại.</div>
      ) : (
        items.map((item) => (
          <Button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            unstyled
            className="card-interactive stagger-item w-full p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-text-primary">{item.contractCode || "Không có mã"}</p>
                <p className="text-caption text-text-muted">
                  {item.customerName || "Khách vãng lai"} · {formatFinanceDate(item.contractDate)}
                </p>
              </div>
              <Badge variant={financeStatusVariant(item.status)}>{financeStatusLabel(item.status)}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-caption text-text-muted">Doanh thu</p>
                <p className="tabular-nums font-semibold text-text-primary">{formatVnd(item.totalAmount)}</p>
              </div>
              <div>
                <p className="text-caption text-text-muted">Chi phí</p>
                <p className="tabular-nums font-semibold text-text-primary">{formatVnd(item.totalCost)}</p>
              </div>
              <div>
                <p className="text-caption text-text-muted">Lợi nhuận</p>
                <p className={cn("tabular-nums font-bold", item.profit >= 0 ? "text-success" : "text-error")}>
                  {item.profit >= 0 ? "+" : ""}
                  {formatVnd(item.profit)}
                </p>
              </div>
              <div>
                <p className="text-caption text-text-muted">Cần thu</p>
                <p className="tabular-nums font-semibold text-text-primary">{formatVnd(item.remainingAmount)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getMarginVariant(item.profitMargin)}>Biên {formatPercent(item.profitMargin)}</Badge>
                <Badge variant={getCollectionVariant(item)}>{getCollectionLabel(item)}</Badge>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </div>
          </Button>
        ))
      )}
    </div>
  );
}

export function ProfitReportTable({
  initialData,
  initialStatus = "all",
  initialFromDate = "",
  initialToDate = "",
}: ProfitReportTableProps) {
  const [status, setStatus] = useState(initialStatus);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [page, setPage] = useState(initialData?.page || 1);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const pageSize = initialData?.pageSize || EMPTY_RESULT.pageSize;
  const initialKey = useMemo(
    () => cacheKeys.financeProfitReport(initialStatus, initialFromDate, initialToDate, initialData?.page || 1),
    [initialData?.page, initialFromDate, initialStatus, initialToDate],
  );
  const key = cacheKeys.financeProfitReport(status, fromDate, toDate, page);
  const isInitialQuery = key === initialKey;

  const report = useSWR(
    key,
    () =>
      requireData(
        getContractProfitReport({
          status,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page,
          pageSize,
        }),
      ),
    isInitialQuery && initialData
      ? { fallbackData: initialData, ...HYDRATED_FALLBACK_OPTIONS }
      : undefined,
  );

  useEffect(() => {
    if (report.error) {
      toast.error(report.error.message || "Không tải được báo cáo lợi nhuận.");
    }
  }, [report.error]);

  const data = report.data ?? (isInitialQuery ? initialData : undefined) ?? EMPTY_RESULT;
  const totalPages = Math.max(1, Math.ceil(data.total / Math.max(data.pageSize, 1)));

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setPage(1);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setPage(1);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="card-base p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="icon-box bg-primary/10">
                  <ReceiptText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-h3">Lợi nhuận theo hợp đồng</h3>
                  <p className="text-caption text-text-muted">Đọc theo cùng một semantic doanh thu, chi phí và biên lợi nhuận.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge variant="primary">{data.total} hợp đồng</Badge>
              {fromDate && toDate && (
                <Badge variant="info">
                  <span className="inline-flex items-center gap-1">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {fromDate} đến {toDate}
                  </span>
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <SelectPill
              value={status}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
              placeholder="Trạng thái"
              defaultValue="all"
            />
            <DatePicker value={fromDate} onChange={handleFromDateChange} placeholder="Từ ngày" className="w-full lg:w-40" />
            <DatePicker value={toDate} onChange={handleToDateChange} placeholder="Đến ngày" className="w-full lg:w-40" />
          </div>
        </div>

        {report.isLoading && data.items.length === 0 ? (
          <div className="card-base p-4">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <>
            <ProfitDesktopTable items={data.items} onSelect={setSelectedContractId} />
            <ProfitMobileList items={data.items} onSelect={setSelectedContractId} />
          </>
        )}

        <div className="card-base flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-body-sm text-text-secondary">
            Trang {data.page} / {totalPages} · {data.items.length} / {data.total} hợp đồng
          </p>
          <Pagination page={data.page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      <ContractProfitDetailDrawer
        contractId={selectedContractId || ""}
        open={Boolean(selectedContractId)}
        onOpenChange={(open) => {
          if (!open) setSelectedContractId(null);
        }}
      />
    </>
  );
}
