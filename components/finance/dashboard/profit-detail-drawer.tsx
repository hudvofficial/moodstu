"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { AlertCircle, FileText, Package, Printer, Receipt, SearchX, Users, type LucideIcon } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/ux-states";
import { getContractFinanceDetails } from "@/app/actions/finance-dashboard-queries";
import { formatVnd, financeStatusLabel, financeStatusVariant, formatFinanceDate } from "@/components/finance/finance-format";
import { useSWR } from "@/lib/swr";
import { toast } from "sonner";
import { getWorkTypeLabel } from "@/types/contract-constants";
import type { WorkType } from "@/types/contract";
import type { ContractProfitDetailData } from "@/types/finance-dashboard";

interface ContractProfitDetailDrawerProps {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProfitDetailSection({
  icon: Icon,
  iconToneClassName,
  title,
  total,
  children,
}: {
  icon: LucideIcon;
  iconToneClassName: string;
  title: string;
  total?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`icon-box ${iconToneClassName}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h4 className="section-heading">{title}</h4>
        </div>
        {typeof total === "number" ? (
          <span className="tabular-nums font-bold text-error">{formatVnd(total)}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CompactEmptyState({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      compact
      icon={icon}
      title={title}
      description={description}
      className="card-base border border-dashed border-border/70 bg-bg-sidebar/30"
    />
  );
}

export function ContractProfitDetailDrawer({ contractId, open, onOpenChange }: ContractProfitDetailDrawerProps) {
  const { data, isLoading, error } = useSWR<ContractProfitDetailData>(
    open && contractId ? `finance_contract_details_${contractId}` : null,
    async () => {
      const res = await getContractFinanceDetails(contractId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  );

  const contractTitle = data ? `Lợi nhuận HĐ: ${data.contract.contract_code}` : "Chi tiết Hợp đồng";
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
  const inventoryTotal = useMemo(() => data?.inventory.reduce((acc, cur) => acc + cur.total_cost, 0) || 0, [data]);
  
  const totalCost = payrollTotal + printTotal + opsTotal + inventoryTotal;
  const netProfit = (data?.contract.total_amount || 0) - totalCost;

  useEffect(() => {
    if (error && open) {
      toast.error(error.message || "Không thể tải chi tiết hợp đồng");
    }
  }, [error, open]);

  const isInitialLoading = isLoading && !data && !error;
  const hasFatalError = Boolean(error) && !data;

  const formatWorkType = (workType: string) => {
    return getWorkTypeLabel(workType as WorkType);
  };

  return (
    <Drawer
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={contractTitle}
      titleBadge={contractBadge}
      size="lg"
    >
      <div className="space-y-6 pb-6">
        {isInitialLoading ? (
          <div className="space-y-5">
            <SkeletonTable rows={3} />
            <SkeletonTable rows={4} />
            <SkeletonTable rows={4} />
          </div>
        ) : hasFatalError ? (
          <EmptyState
            icon={AlertCircle}
            title="Không tải được chi tiết hợp đồng"
            description="Dữ liệu lợi nhuận của hợp đồng này hiện chưa thể tải. Mở lại drawer hoặc thử lại sau."
            className="card-base border border-error/20 bg-error/5 py-12"
          />
        ) : data ? (
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
                   <div className="text-xs text-text-tertiary mb-1">Doanh thu thuần (sau KM)</div>
                   <div className="font-bold tabular-nums text-text-primary">{formatVnd(data.contract.total_amount)}</div>
                 </div>
               </div>
            </div>

            {/* BLOCK 1: DOANH THU CHI TIẾT */}
            <ProfitDetailSection
              icon={Receipt}
              iconToneClassName="bg-primary/10 text-primary"
              title="Cấu thành Doanh thu"
            >
              {data.details.length === 0 ? (
                <CompactEmptyState
                  icon={SearchX}
                  title="Chưa có chi tiết doanh thu"
                  description="Hợp đồng này chưa có hạng mục doanh thu để hiển thị."
                />
              ) : (
                <div className="card-base divide-y divide-border/50">
                  {data.details.map((detail) => (
                    <div key={detail.id} className="flex items-center justify-between p-3 text-sm">
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
            </ProfitDetailSection>

            {/* BLOCK 2: CHI PHÍ NHÂN SỰ */}
            <ProfitDetailSection
              icon={Users}
              iconToneClassName="bg-info/10 text-info"
              title="Chi phí Lương"
              total={payrollTotal}
            >
              {data.tasks.length === 0 ? (
                <CompactEmptyState
                  icon={Users}
                  title="Chưa có chi phí lương"
                  description="Hợp đồng này chưa phát sinh chi phí nhân sự."
                />
              ) : (
                <div className="card-base divide-y divide-border/50">
                  {data.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary">{formatWorkType(task.work_type)}</span>
                        <span className="text-xs text-text-tertiary">
                          NV: {task.employees?.full_name || "Chưa phân công"}
                        </span>
                      </div>
                      <div className="font-medium text-error tabular-nums">{formatVnd(task.cost)}</div>
                    </div>
                  ))}
                </div>
              )}
            </ProfitDetailSection>

            {/* BLOCK 3: CHI PHÍ IN ẤN */}
            <ProfitDetailSection
              icon={Printer}
              iconToneClassName="bg-primary/10 text-primary"
              title="Chi phí In ấn"
              total={printTotal}
            >
              {data.orders.length === 0 ? (
                <CompactEmptyState
                  icon={Printer}
                  title="Chưa có yêu cầu in ấn"
                  description="Hợp đồng này chưa phát sinh hạng mục in ấn."
                />
              ) : (
                <div className="card-base divide-y divide-border/50">
                  {data.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary">{order.item_name}</span>
                        <span className="text-xs text-text-tertiary">
                          Số lượng: {order.quantity} • ST: {financeStatusLabel(order.payment_status)}
                        </span>
                      </div>
                      <div className="font-medium text-error tabular-nums">{formatVnd(order.cost)}</div>
                    </div>
                  ))}
                </div>
              )}
            </ProfitDetailSection>

            <ProfitDetailSection
              icon={Package}
              iconToneClassName="bg-success/10 text-success"
              title="Giá vốn vật tư"
              total={inventoryTotal}
            >
              {data.inventory.length === 0 ? (
                <CompactEmptyState
                  icon={Package}
                  title="Chưa có xuất vật tư"
                  description="Hợp đồng này chưa phát sinh giá vốn từ kho vật tư."
                />
              ) : (
                <div className="card-base divide-y divide-border/50">
                  {data.inventory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary">{item.item_name}</span>
                        <span className="text-xs text-text-tertiary">
                          {item.quantity} x {formatVnd(item.unit_cost)}
                          {item.source_type === "contract_addon_sale" ? " (Bán thêm)" : ""}
                        </span>
                      </div>
                      <div className="font-medium text-error tabular-nums">{formatVnd(item.total_cost)}</div>
                    </div>
                  ))}
                </div>
              )}
            </ProfitDetailSection>

            {/* BLOCK 4: CHI PHÍ KHÁC */}
            <ProfitDetailSection
              icon={FileText}
              iconToneClassName="bg-warning/10 text-interactive"
              title="Chi phí Vận hành Khác"
              total={opsTotal}
            >
              {data.expenses.length === 0 ? (
                <CompactEmptyState
                  icon={FileText}
                  title="Chưa có chi phí vận hành"
                  description="Hợp đồng này chưa phát sinh khoản chi vận hành khác."
                />
              ) : (
                <div className="card-base divide-y divide-border/50">
                  {data.expenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary">{exp.description || "Chi phí"}</span>
                        {exp.transaction_date ? (
                          <span className="text-xs text-text-tertiary">{formatFinanceDate(exp.transaction_date)}</span>
                        ) : null}
                      </div>
                      <div className="font-medium text-error tabular-nums">{formatVnd(exp.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </ProfitDetailSection>
          </>
        ) : null}
      </div>
    </Drawer>
  );
}
