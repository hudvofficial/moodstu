"use client";

import { useMemo } from "react";
import { Receipt, Users, Printer, FileText } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getContractFinanceDetails } from "@/app/actions/finance-dashboard-queries";
import { formatVnd, financeStatusLabel, financeStatusVariant, formatFinanceDate } from "@/components/finance/finance-format";
import { useSWR } from "@/lib/swr";
import { toast } from "sonner";
import type { ContractProfitDetailData } from "@/types/finance-dashboard";

interface ContractProfitDetailDrawerProps {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractProfitDetailDrawer({ contractId, open, onOpenChange }: ContractProfitDetailDrawerProps) {
  const { data, isLoading, error } = useSWR<ContractProfitDetailData>(
    open && contractId ? `finance_contract_details_${contractId}` : null,
    async () => {
      const res = await getContractFinanceDetails(contractId);
      if ("error" in res && !res.success) throw new Error(res.error as string);
      return ("data" in res ? res.data : (res as any).data) as ContractProfitDetailData;
    }
  );

  const contractTitle = isLoading || !data ? "Chi tiết Hợp đồng" : `Lợi nhuận HĐ: ${data.contract.contract_code}`;
  const contractBadge = data ? (
    <Badge variant={financeStatusVariant(data.contract.status)}>
      {financeStatusLabel(data.contract.status)}
    </Badge>
  ) : undefined;

  // Derived summaries
  const packageTotal = useMemo(() => data?.details.filter(d => d.item_type !== "ADDON").reduce((acc, cur) => acc + cur.total_amount, 0) || 0, [data]);
  const addonTotal = useMemo(() => data?.details.filter(d => d.item_type === "ADDON").reduce((acc, cur) => acc + cur.total_amount, 0) || 0, [data]);
  const payrollTotal = useMemo(() => data?.tasks.reduce((acc, cur) => acc + cur.cost, 0) || 0, [data]);
  const printTotal = useMemo(() => data?.orders.reduce((acc, cur) => acc + cur.cost, 0) || 0, [data]);
  const opsTotal = useMemo(() => data?.expenses.reduce((acc, cur) => acc + cur.amount, 0) || 0, [data]);
  
  const totalCost = payrollTotal + printTotal + opsTotal;
  const netProfit = (data?.contract.total_amount || 0) - totalCost;

  if (error) {
    toast.error(error.message || "Không thể tải chi tiết hợp đồng");
  }

  return (
    <Drawer 
      isOpen={open} 
      onClose={() => onOpenChange(false)}
      title={contractTitle}
      titleBadge={contractBadge}
      size="lg"
    >
      <div className="space-y-6 pb-6">
        {isLoading || !data ? (
          <div className="space-y-5">
            <SkeletonTable rows={3} />
            <SkeletonTable rows={4} />
            <SkeletonTable rows={4} />
          </div>
        ) : error ? (
          <div className="card-base p-6 text-center text-error border-error/20 bg-error/10">
            <p>Đã xảy ra lỗi khi tải dữ liệu. Vui lòng kết nối lại.</p>
          </div>
        ) : (
          <>
            {/* TỔNG QUAN TÀI CHÍNH (STRIPE STYLE) */}
            <div className="card-base bg-bg-sidebar/50 p-5 border border-border/50">
               <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
                 <div>
                   <h3 className="section-heading">{data.contract.customer_name}</h3>
                   <div className="text-sm text-text-tertiary">Ngày ký: {formatFinanceDate(data.contract.created_at)}</div>
                 </div>
                 <div className="text-right">
                   <div className="text-sm text-text-tertiary">Lợi nhuận tịnh</div>
                   <div className={`text-amount tabular-nums ${netProfit >= 0 ? "text-success" : "text-error"}`}>
                     {netProfit >= 0 ? "+" : ""}{formatVnd(netProfit)}
                   </div>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div>
                   <div className="text-xs text-text-tertiary mb-1">Gói dịch vụ</div>
                   <div className="font-semibold tabular-nums">{formatVnd(packageTotal)}</div>
                 </div>
                 <div>
                   <div className="text-xs text-text-tertiary mb-1">Phát sinh</div>
                   <div className="font-semibold tabular-nums">{formatVnd(addonTotal)}</div>
                 </div>
                 <div>
                   <div className="text-xs text-error/80 mb-1">Khuyến mãi</div>
                   <div className="font-semibold text-error tabular-nums">-{formatVnd(data.contract.discount)}</div>
                 </div>
                 <div>
                   <div className="text-xs text-text-tertiary mb-1">Thực thu (Sau KM)</div>
                   <div className="font-bold tabular-nums text-text-primary">{formatVnd(data.contract.total_amount)}</div>
                 </div>
               </div>
            </div>

            {/* BLOCK 1: DOANH THU CHI TIẾT */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 mb-2">
                 <div className="icon-box bg-primary/10">
                   <Receipt className="w-4 h-4 text-primary" />
                 </div>
                 <h4 className="section-heading">Cấu thành Doanh thu</h4>
               </div>
               {data.details.length === 0 ? (
                 <div className="text-sm text-text-muted italic px-2">Không có chi tiết.</div>
               ) : (
                 <div className="card-base divide-y divide-border/50">
                    {data.details.map((detail) => (
                      <div key={detail.id} className="flex justify-between items-center p-3 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{detail.service_name}</span>
                          <span className="text-xs text-text-tertiary">
                            {detail.quantity} x {formatVnd(detail.unit_price)}
                            {detail.item_type === "ADDON" && " (Phát sinh)"}
                          </span>
                        </div>
                        <div className="font-medium tabular-nums">{formatVnd(detail.total_amount)}</div>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            {/* BLOCK 2: CHI PHÍ NHÂN SỰ */}
            <div className="space-y-3">
               <div className="flex items-center justify-between gap-2 mb-2">
                 <div className="flex items-center gap-2">
                   <div className="icon-box bg-info/10">
                     <Users className="w-4 h-4 text-info" />
                   </div>
                   <h4 className="section-heading">Chi phí Lương</h4>
                 </div>
                 <span className="text-error font-bold tabular-nums">{formatVnd(payrollTotal)}</span>
               </div>
               
               {data.tasks.length === 0 ? (
                 <div className="text-sm text-text-muted italic px-2">Khách chưa có chi phí lương.</div>
               ) : (
                 <div className="card-base divide-y divide-border/50">
                    {data.tasks.map((task) => (
                      <div key={task.id} className="flex justify-between items-center p-3 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{task.work_type}</span>
                          <span className="text-xs text-text-tertiary">
                            NV: {task.employees?.full_name || "Chưa phân công"}
                          </span>
                        </div>
                        <div className="font-medium text-error tabular-nums">{formatVnd(task.cost)}</div>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            {/* BLOCK 3: CHI PHÍ IN ẤN */}
            <div className="space-y-3">
               <div className="flex items-center justify-between gap-2 mb-2">
                 <div className="flex items-center gap-2">
                   <div className="icon-box bg-primary/10">
                     <Printer className="w-4 h-4 text-primary" />
                   </div>
                   <h4 className="section-heading">Chi phí In ấn</h4>
                 </div>
                 <span className="text-error font-bold tabular-nums">{formatVnd(printTotal)}</span>
               </div>
               
               {data.orders.length === 0 ? (
                 <div className="text-sm text-text-muted italic px-2">Không có yêu cầu in ấn.</div>
               ) : (
                 <div className="card-base divide-y divide-border/50">
                    {data.orders.map((order) => (
                      <div key={order.id} className="flex justify-between items-center p-3 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{order.item_name}</span>
                          <span className="text-xs text-text-tertiary">Số lượng: {order.quantity} • ST: {financeStatusLabel(order.payment_status)}</span>
                        </div>
                        <div className="font-medium text-error tabular-nums">{formatVnd(order.cost)}</div>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            {/* BLOCK 4: CHI PHÍ KHÁC */}
            <div className="space-y-3">
               <div className="flex items-center justify-between gap-2 mb-2">
                 <div className="flex items-center gap-2">
                   <div className="icon-box bg-warning/10">
                     <FileText className="w-4 h-4 text-interactive" />
                   </div>
                   <h4 className="section-heading">Chi phí Vận hành Khác</h4>
                 </div>
                 <span className="text-error font-bold tabular-nums">{formatVnd(opsTotal)}</span>
               </div>
               
               {data.expenses.length === 0 ? (
                 <div className="text-sm text-text-muted italic px-2">Không có khoản chi khác.</div>
               ) : (
                 <div className="card-base divide-y divide-border/50">
                    {data.expenses.map((exp) => (
                      <div key={exp.id} className="flex justify-between items-center p-3 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{exp.description || "Chi phí"}</span>
                          {exp.transaction_date && <span className="text-xs text-text-tertiary">{formatFinanceDate(exp.transaction_date)}</span>}
                        </div>
                        <div className="font-medium text-error tabular-nums">{formatVnd(exp.amount)}</div>
                      </div>
                    ))}
                 </div>
               )}
            </div>

          </>
        )}
      </div>
    </Drawer>
  );
}
