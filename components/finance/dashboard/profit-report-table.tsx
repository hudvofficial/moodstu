"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart3, ChevronRight, Tags } from "lucide-react";
import { getContractProfitReport } from "@/app/actions/finance-dashboard-queries";
import { Badge } from "@/components/ui/badge";
import DatePicker from "@/components/ui/date-picker";
import { Pagination } from "@/components/ui/pagination";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, useSWR } from "@/lib/swr";
import { financeStatusLabel, financeStatusVariant, formatFinanceDate, formatVnd, formatCompactVnd } from "@/components/finance/finance-format";
import type { ActionResult } from "@/types/action-result";
import type { ContractProfitRow, PaginatedResult } from "@/types/finance-dashboard";
import { ContractProfitDetailDrawer } from "./profit-detail-drawer";

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
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <div className="col-span-2 sm:col-span-1">
            <SimpleSelect value={status} onChange={(value) => updateFilter(setStatus, value)} options={statusOptions} />
          </div>
          <DatePicker value={fromDate} onChange={(value) => updateFilter(setFromDate, value)} placeholder="Từ ngày" />
          <DatePicker value={toDate} onChange={(value) => updateFilter(setToDate, value)} placeholder="Đến ngày" />
        </div>
      </div>

      {isLoading && !data ? (
        <div className="card-base p-4">
          <SkeletonTable rows={5} />
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW: PREMIUM HIG COMPLIANT TABLE */}
          <div className="hidden lg:block">
            <TableWrapper>
              <THead>
                <tr>
                  <TH>Hợp đồng</TH>
                  <TH>Khách hàng</TH>
                  <TH className="text-right">Thực thu</TH>
                  <TH className="text-right">Chi phí</TH>
                  <TH className="text-right">Lợi nhuận</TH>
                  <TH className="w-32">Margin</TH>
                  <TH>Trạng thái</TH>
                </tr>
              </THead>
              <TBody>
                {result.items.length === 0 ? (
                  <TR>
                    <TD className="text-text-muted text-center" colSpan={7}>
                      Chưa có dữ liệu phù hợp với bộ lọc.
                    </TD>
                  </TR>
                ) : (
                  result.items.map((row) => (
                    <TR 
                      key={row.id} 
                      className="group cursor-pointer hover:bg-content-hover/30 transition-colors"
                      onClick={() => setSelectedContractId(row.id)}
                    >
                      <TD>
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary">{row.contractCode}</span>
                          <span className="text-xs text-text-tertiary">{formatFinanceDate(row.contractDate)}</span>
                        </div>
                      </TD>
                      <TD>
                        <span className="font-medium">{row.customerName}</span>
                      </TD>
                      <TD className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="tabular-nums font-bold text-text-primary">
                            {formatVnd(row.totalAmount)}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-text-tertiary">
                            <span>Gói: {formatCompactVnd(row.packageRevenue)}</span>
                            <span>•</span>
                            <span>PS: {formatCompactVnd(row.addonRevenue)}</span>
                            {row.discount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-error flex items-center" title="Khuyến mãi">
                                  <Tags className="w-3 h-3 mr-0.5" />
                                  -{formatCompactVnd(row.discount)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD className="text-right">
                        <span className="tabular-nums font-bold text-error">
                          {formatVnd(row.totalCost)}
                        </span>
                      </TD>
                      <TD className="text-right">
                        <span className={`tabular-nums font-bold ${row.profit >= 0 ? "text-success" : "text-error"}`}>
                          {row.profit >= 0 ? "+" : ""}{formatVnd(row.profit)}
                        </span>
                      </TD>
                      <TD>
                        <div className="flex flex-col gap-1 w-full max-w-[100px] ml-auto mr-0">
                          <div className="flex justify-between items-center text-xs">
                            <span className={row.profitMargin >= 0 ? "text-success font-medium" : "text-error font-medium"}>
                              {row.profitMargin}%
                            </span>
                          </div>
                          <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${row.profitMargin >= 0 ? "bg-success" : "bg-error"}`} 
                              style={{ width: `${Math.min(100, Math.max(0, Math.abs(row.profitMargin)))}%` }}
                            />
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex items-center justify-between gap-2">
                           <Badge variant={financeStatusVariant(row.status)}>{financeStatusLabel(row.status)}</Badge>
                           <ChevronRight className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </TableWrapper>
          </div>

          {/* MOBILE VIEW: HIG CARD BASED LIST */}
          <div className="lg:hidden space-y-3">
            {result.items.length === 0 ? (
               <div className="card-base p-6 text-center text-text-muted">Chưa có dữ liệu phù hợp với bộ lọc.</div>
            ) : (
               result.items.map((row) => (
                 <div 
                   key={row.id} 
                   className="card-base p-4 cursor-pointer active:scale-[0.98] transition-transform flex flex-col gap-3 relative overflow-hidden"
                   onClick={() => setSelectedContractId(row.id)}
                 >
                   <div className="flex justify-between items-start">
                     <div>
                       <div className="font-semibold text-text-primary text-base">{row.contractCode}</div>
                       <div className="text-xs text-text-secondary">{formatFinanceDate(row.contractDate)} • {row.customerName}</div>
                     </div>
                     <Badge variant={financeStatusVariant(row.status)}>{financeStatusLabel(row.status)}</Badge>
                   </div>
                   
                   <div className="bg-background-secondary/50 rounded-lg p-3 grid grid-cols-2 gap-3">
                     <div>
                       <div className="text-xs text-text-tertiary mb-1">Thực thu</div>
                       <div className="font-bold text-text-primary tabular-nums text-base">{formatVnd(row.totalAmount)}</div>
                     </div>
                     <div>
                       <div className="text-xs text-text-tertiary mb-1">Chi phí</div>
                       <div className="font-bold text-error tabular-nums text-base">{formatVnd(row.totalCost)}</div>
                     </div>
                   </div>

                   <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs text-text-tertiary">Lợi nhuận</div>
                        <div className={`font-bold tabular-nums text-lg ${row.profit >= 0 ? "text-success" : "text-error"}`}>
                           {row.profit >= 0 ? "+" : ""}{formatVnd(row.profit)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 min-w-[70px]">
                         <span className={`text-sm font-bold ${row.profitMargin >= 0 ? "text-success" : "text-error"}`}>
                           {row.profitMargin}%
                         </span>
                         <div className="w-16 bg-border/40 rounded-full h-1.5 overflow-hidden">
                           <div 
                             className={`h-full rounded-full ${row.profitMargin >= 0 ? "bg-success" : "bg-error"}`} 
                             style={{ width: `${Math.min(100, Math.max(0, Math.abs(row.profitMargin)))}%` }}
                           />
                         </div>
                      </div>
                   </div>

                   {row.discount > 0 && (
                     <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                       <div className="absolute -top-4 -right-4 w-8 h-8 bg-error rotate-45" />
                     </div>
                   )}
                 </div>
               ))
            )}
          </div>
        </>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      
      {/* Dummy placeholder for Phase 04 ContractProfitDetailDrawer */}
      {selectedContractId && (
        <ContractProfitDetailDrawer 
          contractId={selectedContractId} 
          open={!!selectedContractId} 
          onOpenChange={(isOpen: boolean) => !isOpen && setSelectedContractId(null)} 
        />
      )}
    </div>
  );
}
