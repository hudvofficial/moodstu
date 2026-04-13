"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
import { getContractProfitReport } from "@/app/actions/finance-dashboard-queries";
import { Badge } from "@/components/ui/badge";
import DatePicker from "@/components/ui/date-picker";
import { Pagination } from "@/components/ui/pagination";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, useSWR } from "@/lib/swr";
import { financeStatusLabel, financeStatusVariant, formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import type { ActionResult } from "@/types/action-result";
import type { ContractProfitRow, PaginatedResult } from "@/types/finance-dashboard";

interface ProfitReportTableProps {
  initialData: PaginatedResult<ContractProfitRow>;
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function ProfitReportTable({ initialData }: ProfitReportTableProps) {
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const key = cacheKeys.financeProfitReport(status, fromDate, toDate, page);

  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(getContractProfitReport({ status, fromDate, toDate, page, pageSize })),
    { fallbackData: initialData }
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được báo cáo lợi nhuận.");
  }, [error]);

  const result = data || initialData;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const statusOptions = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "dang_thuc_hien", label: "Đang thực hiện" },
    { value: "hoan_thanh", label: "Hoàn thành" },
    { value: "da_huy", label: "Đã hủy" },
  ];

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="icon-box bg-success/10">
            <BarChart3 className="w-4 h-4 text-success" />
          </div>
          <div>
            <h3 className="section-title">Báo cáo lợi nhuận theo HĐ</h3>
            <p className="text-caption">Doanh thu, chi phí và margin theo từng hợp đồng.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <SimpleSelect value={status} onChange={(value) => updateFilter(setStatus, value)} options={statusOptions} />
          <DatePicker value={fromDate} onChange={(value) => updateFilter(setFromDate, value)} placeholder="Từ ngày" />
          <DatePicker value={toDate} onChange={(value) => updateFilter(setToDate, value)} placeholder="Đến ngày" />
        </div>
      </div>

      {isLoading && !data ? (
        <div className="card-base p-5">
          <SkeletonTable rows={5} />
        </div>
      ) : (
        <TableWrapper>
          <THead>
            <tr>
              <TH>HĐ</TH>
              <TH>Khách hàng</TH>
              <TH>Ngày ký</TH>
              <TH className="text-right">Doanh thu</TH>
              <TH className="text-right">Chi phí</TH>
              <TH className="text-right">Lợi nhuận</TH>
              <TH className="text-right">Margin</TH>
              <TH>Trạng thái</TH>
            </tr>
          </THead>
          <TBody>
            {result.items.length === 0 ? (
              <TR>
                <TD className="text-text-muted" colSpan={8}>
                  Chưa có dữ liệu phù hợp với bộ lọc.
                </TD>
              </TR>
            ) : (
              result.items.map((row) => (
                <TR key={row.id}>
                  <TD><span className="font-semibold">{row.contractCode}</span></TD>
                  <TD>{row.customerName}</TD>
                  <TD className="text-text-secondary">{formatFinanceDate(row.contractDate)}</TD>
                  <TD className="text-right"><span className="tabular-nums font-bold">{formatVnd(row.totalAmount)}</span></TD>
                  <TD className="text-right"><span className="tabular-nums font-bold text-error">{formatVnd(row.totalCost)}</span></TD>
                  <TD className="text-right">
                    <span className={`tabular-nums font-bold ${row.profit >= 0 ? "text-success" : "text-error"}`}>
                      {formatVnd(row.profit)}
                    </span>
                  </TD>
                  <TD className="text-right">
                    <span className={`tabular-nums ${row.profitMargin >= 0 ? "text-success" : "text-error"}`}>
                      {row.profitMargin >= 0 ? "↑" : "↓"}{Math.abs(row.profitMargin)}%
                    </span>
                  </TD>
                  <TD><Badge variant={financeStatusVariant(row.status)}>{financeStatusLabel(row.status)}</Badge></TD>
                </TR>
              ))
            )}
          </TBody>
        </TableWrapper>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
