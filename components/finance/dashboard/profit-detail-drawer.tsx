"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ExternalLink, FileText, MapPin, Package, Phone, Printer, SearchX, Users, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { getContractFinanceDetails } from "@/app/actions/finance-dashboard-queries";
import { financeStatusLabel, formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/ux-states";
import { useSWR } from "@/lib/swr";
import { cn, formatCurrency } from "@/lib/utils";
import {
  CONTRACT_STATUS_MAP,
  TASK_STATUS_MAP,
  getStatusLabel,
  getTaskStatusLabel,
  getWorkTypeLabel,
} from "@/types/contract-constants";
import type { ContractStatus, TaskStatus, WorkType } from "@/types/contract";
import type { ContractProfitDetailData } from "@/types/finance-dashboard";

// T-20260826-profit-drawer-align: cùng khung với drawer vận hành hợp đồng (Drawer 480px mặc định,
// header = mã HĐ + badge trạng thái, thẻ khách hàng, thẻ số theo ngữ pháp thẻ THANH TOÁN, footer
// "Chi tiết hợp đồng"). Số lợi nhuận từ contract_financials (ADR-016) — drawer chỉ liệt kê chi tiết.

interface ContractProfitDetailDrawerProps {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailCard({
  title,
  total,
  totalClassName,
  children,
}: {
  title: string;
  total?: number;
  totalClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="card-base p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">{title}</h4>
        {typeof total === "number" ? (
          <span className={cn("text-caption font-black tabular-nums", totalClassName ?? "text-error")}>{formatVnd(total)}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CompactEmptyState({ icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <EmptyState
      compact
      icon={icon}
      title={title}
      description={description}
      className="border border-dashed border-border/70 bg-bg-sidebar/30"
    />
  );
}

function Row({ name, sub, amount, amountClassName, tag }: { name: string; sub?: ReactNode; amount: number; amountClassName?: string; tag?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-body-sm">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-text-main">{name}</span>
        {sub ? <span className="flex items-center gap-1.5 text-tiny text-text-muted">{sub}</span> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {tag}
        <span className={cn("tabular-nums font-semibold", amountClassName ?? "text-error")}>{formatVnd(amount)}</span>
      </div>
    </div>
  );
}

export function ContractProfitDetailDrawer({ contractId, open, onOpenChange }: ContractProfitDetailDrawerProps) {
  const router = useRouter();
  const { data, isLoading, error } = useSWR<ContractProfitDetailData>(
    open && contractId ? `finance_contract_details_${contractId}` : null,
    async () => {
      const res = await getContractFinanceDetails(contractId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  );

  useEffect(() => {
    if (error && open) {
      toast.error(error.message || "Không thể tải chi tiết hợp đồng");
    }
  }, [error, open]);

  const isInitialLoading = isLoading && !data && !error;
  const hasFatalError = Boolean(error) && !data;

  const status = (data?.contract.status || "cho_xu_ly") as ContractStatus;
  const titleBadge = data ? (
    <Badge variant={CONTRACT_STATUS_MAP[status]?.variant || "info"}>{getStatusLabel(status)}</Badge>
  ) : undefined;

  // push trực tiếp, KHÔNG onClose trước: điều hướng sang route khác tự unmount list+drawer
  // (gọi onClose trước push gây race nuốt navigation — cùng lý do ở contract-drawer.tsx).
  const goDetail = () => {
    if (contractId) router.push(`/contracts/${contractId}`);
  };

  const fin = data?.financials;
  const contract = data?.contract;
  const costShare = fin && fin.revenue > 0 ? Math.min(100, Math.round((fin.total_cost / fin.revenue) * 100)) : 0;
  const packageTotal = data?.details.filter((d) => d.item_type !== "ADDON").reduce((sum, d) => sum + d.total_amount, 0) ?? 0;
  const addonTotal = data?.details.filter((d) => d.item_type === "ADDON").reduce((sum, d) => sum + d.total_amount, 0) ?? 0;
  const crewTotal = data?.tasks.filter((t) => !t.is_vendor).reduce((sum, t) => sum + t.cost, 0) ?? 0;
  const vendorTotal = data?.tasks.filter((t) => t.is_vendor).reduce((sum, t) => sum + t.cost, 0) ?? 0;

  return (
    <Drawer isOpen={open} onClose={() => onOpenChange(false)} title={contract?.contract_code || "Hợp đồng"} titleBadge={titleBadge}>
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
      ) : data && contract && fin ? (
        <div className="flex flex-col gap-5">
          {/* ── Khách hàng (cùng markup drawer vận hành) ── */}
          <section className="card-base p-4">
            <Button unstyled onClick={goDetail} className="group flex w-full items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-black text-primary transition-all group-hover:bg-primary group-hover:text-white">
                {(contract.customer_name || "K")[0].toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col">
                <h3 className="truncate text-body-sm font-bold text-text-main group-hover:text-primary">{contract.customer_name}</h3>
                <div className="flex items-center gap-3 text-tiny text-text-muted">
                  {contract.customer_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {contract.customer_phone}
                    </span>
                  )}
                  {contract.customer_address && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />
                      {contract.customer_address}
                    </span>
                  )}
                </div>
              </div>
            </Button>

            <div className="mt-3 flex gap-2">
              <div className="flex-1 rounded-md border border-warning/10 bg-warning/5 px-3 py-2">
                <span className="block text-tiny font-bold uppercase text-warning/70">Ngày chụp</span>
                <span className="block truncate text-body-sm font-bold text-text-main">
                  {contract.work_date ? formatFinanceDate(contract.work_date) : "—"}
                </span>
              </div>
              <div className="flex-1 rounded-md border border-primary/10 bg-primary/5 px-3 py-2">
                <span className="block text-tiny font-bold uppercase text-primary/70">Ngày ký</span>
                <span className="block truncate text-body-sm font-bold text-primary">
                  {contract.contract_date ? formatFinanceDate(contract.contract_date) : "—"}
                </span>
              </div>
            </div>
          </section>

          {/* ── Lợi nhuận (ngữ pháp thẻ THANH TOÁN) ── */}
          <section className="card-base p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
                Lợi nhuận <span className="normal-case tracking-normal text-tiny font-medium text-text-muted">(VND)</span>
              </h4>
              <span className={cn("text-caption font-black tabular-nums", fin.profit >= 0 ? "text-success" : "text-error")}>
                {fin.profit_margin.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
              </span>
            </div>

            {/* 3 số không có hậu tố VND (đơn vị ở tiêu đề) + nowrap → không gãy dòng ở phone 375 với mọi số tiền */}
            <div className="mb-3 flex items-stretch">
              <div className="min-w-0 flex-1 text-center">
                <span className="block text-tiny font-bold uppercase text-text-muted">Doanh thu</span>
                <span className="block whitespace-nowrap text-body-sm font-black tabular-nums text-text-main">{formatCurrency(fin.revenue)}</span>
              </div>
              <div className="my-1 w-px shrink-0 bg-border/50" />
              <div className="min-w-0 flex-1 text-center">
                <span className="block text-tiny font-bold uppercase text-text-muted">Chi phí</span>
                <span className={cn("block whitespace-nowrap text-body-sm font-black tabular-nums", fin.total_cost > 0 ? "text-error" : "text-text-muted")}>
                  {formatCurrency(fin.total_cost)}
                </span>
              </div>
              <div className="my-1 w-px shrink-0 bg-border/50" />
              <div className="min-w-0 flex-1 text-center">
                <span className="block text-tiny font-bold uppercase text-text-muted">Lợi nhuận</span>
                <span className={cn("block whitespace-nowrap text-body-sm font-black tabular-nums", fin.profit >= 0 ? "text-success" : "text-error")}>
                  {fin.profit > 0 ? "+" : ""}
                  {formatCurrency(fin.profit)}
                </span>
              </div>
            </div>

            {/* Thanh: phần doanh thu bị chi phí ăn vào */}
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border/30">
              <div
                className={cn("h-full rounded-full transition-all duration-700", fin.profit >= 0 ? "bg-error/60" : "bg-error")}
                style={{ width: `${costShare}%` }}
              />
            </div>

            <p className="text-tiny text-text-muted">
              Đã thu <span className="font-semibold text-success">{formatVnd(contract.paid_amount)}</span> · Còn lại{" "}
              <span className={cn("font-semibold", contract.remaining_amount > 0 ? "text-error" : "text-success")}>
                {formatVnd(contract.remaining_amount)}
              </span>
            </p>
          </section>

          {/* ── Cấu thành doanh thu ── */}
          <DetailCard title="Cấu thành doanh thu" total={fin.revenue} totalClassName="text-text-main">
            {data.details.length === 0 ? (
              <CompactEmptyState icon={SearchX} title="Chưa có chi tiết doanh thu" description="Hợp đồng này chưa có hạng mục doanh thu." />
            ) : (
              <div className="divide-y divide-border/50">
                {data.details.map((detail) => (
                  <Row
                    key={detail.id}
                    name={detail.service_name}
                    sub={`${detail.quantity} × ${formatVnd(detail.unit_price)}${detail.item_type === "ADDON" ? " (Phát sinh)" : ""}`}
                    amount={detail.total_amount}
                    amountClassName="text-text-main"
                  />
                ))}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
              <div className="min-w-0">
                <span className="block text-tiny font-bold uppercase text-text-muted">Gói dịch vụ</span>
                <span className="block whitespace-nowrap text-body-sm font-semibold tabular-nums text-text-main">{formatVnd(packageTotal)}</span>
              </div>
              <div className="min-w-0">
                <span className="block text-tiny font-bold uppercase text-text-muted">Phát sinh</span>
                <span className="block whitespace-nowrap text-body-sm font-semibold tabular-nums text-text-main">{formatVnd(addonTotal)}</span>
              </div>
              <div className="min-w-0">
                <span className="block text-tiny font-bold uppercase text-text-muted">Khuyến mãi</span>
                <span className={cn("block whitespace-nowrap text-body-sm font-semibold tabular-nums", contract.discount > 0 ? "text-error" : "text-text-muted")}>
                  {contract.discount > 0 ? `−${formatVnd(contract.discount)}` : formatVnd(0)}
                </span>
              </div>
              <div className="min-w-0">
                <span className="block text-tiny font-bold uppercase text-text-muted">Doanh thu thuần</span>
                <span className="block whitespace-nowrap text-body-sm font-bold tabular-nums text-text-main">{formatVnd(contract.total_amount)}</span>
              </div>
            </div>
          </DetailCard>

          {/* ── Chi phí nhân sự: ekip + thợ ngoài, mọi task không huỷ (cam kết) ── */}
          <DetailCard title="Chi phí nhân sự" total={fin.task_cost}>
            {data.tasks.length === 0 ? (
              <CompactEmptyState icon={Users} title="Chưa giao việc có chi phí" description="Hợp đồng này chưa có task ekip / thợ ngoài có chi phí." />
            ) : (
              <>
                <div className="divide-y divide-border/50">
                  {data.tasks.map((task) => {
                    const taskStatus = task.status as TaskStatus;
                    const statusVariant = TASK_STATUS_MAP[taskStatus]?.variant;
                    return (
                      <Row
                        key={task.id}
                        name={getWorkTypeLabel(task.work_type as WorkType)}
                        sub={`${task.is_vendor ? "Thợ ngoài" : "Ekip"}: ${task.assignee_name || "Chưa phân công"}`}
                        amount={task.cost}
                        tag={
                          <Badge variant={!statusVariant || statusVariant === "muted" ? "neutral" : statusVariant}>
                            {getTaskStatusLabel(taskStatus)}
                          </Badge>
                        }
                      />
                    );
                  })}
                </div>
                <p className="mt-2 border-t border-border/50 pt-2 text-tiny text-text-muted">
                  Ekip <span className="font-semibold tabular-nums text-text-main">{formatVnd(crewTotal)}</span> · Thợ ngoài{" "}
                  <span className="font-semibold tabular-nums text-text-main">{formatVnd(vendorTotal)}</span>
                </p>
              </>
            )}
          </DetailCard>

          {/* ── Chi phí in ấn (lab) ── */}
          <DetailCard title="Chi phí in ấn" total={fin.print_cost}>
            {data.orders.length === 0 ? (
              <CompactEmptyState icon={Printer} title="Chưa có yêu cầu in ấn" description="Hợp đồng này chưa phát sinh hạng mục in ấn." />
            ) : (
              <div className="divide-y divide-border/50">
                {data.orders.map((order) => (
                  <Row
                    key={order.id}
                    name={order.item_name}
                    sub={`Số lượng: ${order.quantity} · ${financeStatusLabel(order.payment_status)}`}
                    amount={order.cost}
                  />
                ))}
              </div>
            )}
          </DetailCard>

          {/* ── Giá vốn vật tư ── */}
          <DetailCard title="Giá vốn vật tư" total={fin.cogs}>
            {data.inventory.length === 0 ? (
              <CompactEmptyState icon={Package} title="Chưa xuất vật tư" description="Hợp đồng này chưa phát sinh giá vốn từ kho." />
            ) : (
              <div className="divide-y divide-border/50">
                {data.inventory.map((item) => (
                  <Row
                    key={item.id}
                    name={item.item_name}
                    sub={`${item.quantity} × ${formatVnd(item.unit_cost)}${item.source_type === "contract_addon_sale" ? " (Bán thêm)" : ""}`}
                    amount={item.total_cost}
                  />
                ))}
              </div>
            )}
          </DetailCard>

          {/* ── Chi trực tiếp khác (phiếu chi payee_type='other' gắn HĐ) ── */}
          <DetailCard title="Chi trực tiếp khác" total={fin.direct_cost}>
            {data.expenses.length === 0 ? (
              <CompactEmptyState icon={FileText} title="Chưa có chi trực tiếp" description="Hợp đồng này chưa có phiếu chi trực tiếp (thuê xe, hoa…)." />
            ) : (
              <div className="divide-y divide-border/50">
                {data.expenses.map((exp) => (
                  <Row key={exp.id} name={exp.description || "Chi phí"} sub={exp.transaction_date ? formatFinanceDate(exp.transaction_date) : undefined} amount={exp.amount} />
                ))}
              </div>
            )}
          </DetailCard>

          {/* ── Footer (cùng nút drawer vận hành) ── */}
          <div className="pt-2">
            <Button unstyled onClick={goDetail} className="btn btn-primary w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Chi tiết hợp đồng
            </Button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
