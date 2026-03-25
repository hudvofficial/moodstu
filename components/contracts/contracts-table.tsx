"use client";

/**
 * 📋 ContractsTable — Desktop table + Mobile card list
 *
 * V2 WIRED: Receives real contract data with FK-joined customers.
 * Uses snake_case enums + display label maps from contract-constants.
 */

import { ChevronRight, FileText, CheckCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/ux-states";
import { formatCurrency, formatDate, getInitials, CURRENCY_SYMBOL } from "@/lib/utils";
import { getServiceColor, getServiceBadgeColor } from "@/constants/service-colors";
import {
  CONTRACT_STATUS_MAP,
  getServiceLabel,
  getStatusLabel,
} from "@/types/contract-constants";
import type { ContractStatus } from "@/types/contract";
import MissingInfoBadge from "@/components/contracts/missing-info-badge";
import ProgressBadge from "@/components/contracts/progress-badge";

// ─── HELPERS ─────────────────────────────────────

function fmt(amount: number): string {
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  return formatDate(dateStr);
}

function getAvatarColor(serviceType: string | null): string {
  const c = getServiceColor(serviceType);
  return `${c.bg} ${c.text}`;
}

function getStatusVariant(status: ContractStatus): "info" | "warning" | "success" | "error" {
  return CONTRACT_STATUS_MAP[status]?.variant || "info";
}

// ─── PROPS ────────────────────────────────────────

interface ContractsTableProps {
  contracts: Record<string, unknown>[];
  customerMap: Record<string, { id: string; full_name: string; phone?: string }>;
  onView: (contract: Record<string, unknown>) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onHover?: (id: string) => void;
}

// ─── TYPE HELPERS (safe accessors for Record) ────

function getStr(obj: Record<string, unknown>, key: string): string {
  return (obj[key] as string) || "";
}

function getNum(obj: Record<string, unknown>, key: string): number {
  return Number(obj[key]) || 0;
}

function getArr(obj: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const val = obj[key];
  return Array.isArray(val) ? val : [];
}

// ─── DESKTOP TABLE ───────────────────────────────

function DesktopTable({ contracts, customerMap, onView, onHover }: ContractsTableProps) {
  return (
    <div className="hidden lg:block card-base overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="text-xs uppercase tracking-wider text-text-secondary bg-bg-card">
            <th className="px-4 py-3 font-medium">Mã HĐ</th>
            <th className="px-4 py-3 font-medium">Khách hàng</th>
            <th className="px-4 py-3 font-medium">Ngày ký</th>
            <th className="px-4 py-3 font-medium text-right">Tổng cộng</th>
            <th className="px-4 py-3 font-medium text-right">Còn nợ</th>
            <th className="px-4 py-3 font-medium text-center">Thông tin</th>
            <th className="px-4 py-3 font-medium">Tiến độ</th>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="text-sm [&>tr:nth-child(even)]:bg-bg-base/40">
          {contracts.map((c) => {
            const id = getStr(c, "id");
            const status = getStr(c, "status") as ContractStatus;
            const isCancelled = status === "da_huy";
            const customerId = getStr(c, "customer_id");
            const customer = customerMap[customerId];
            const customerName = customer?.full_name || "Khách vãng lai";
            const serviceType = getStr(c, "service_type");
            const svcBadge = getServiceBadgeColor(serviceType);

            return (
              <tr
                key={id}
                onClick={() => onView(c)}
                onMouseEnter={() => onHover?.(id)}
                className={`hover:bg-bg-hover transition-colors group cursor-pointer h-14 ${isCancelled ? "opacity-50" : ""}`}
              >
                <td className="px-4 whitespace-nowrap">
                  <span className="font-semibold text-text-main">
                    {getStr(c, "contract_code")}
                  </span>
                </td>
                <td className="px-4">
                  <div className="flex items-center gap-2">
                    <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(serviceType)}`}>
                      {getInitials(customerName)}
                    </div>
                    <span className={`font-medium text-text-main group-hover:underline underline-offset-4 decoration-primary/30 ${isCancelled ? "line-through" : ""}`}>
                      {customerName}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-md shrink-0 ${svcBadge.bg} ${svcBadge.text}`}>
                      {getServiceLabel(serviceType as import("@/types/contract").ServiceType)}
                    </span>
                  </div>
                </td>
                <td className="px-4 whitespace-nowrap text-text-secondary">
                  {fmtDate(getStr(c, "contract_date") || null)}
                </td>
                <td className="px-4 text-right whitespace-nowrap font-semibold text-text-main">
                  {fmt(getNum(c, "total_amount"))}
                </td>
                <td className="px-4 text-right whitespace-nowrap">
                  {getNum(c, "remaining_amount") > 0 ? (
                    <span className="font-semibold text-error">
                      {fmt(getNum(c, "remaining_amount"))}
                    </span>
                  ) : (
                    <Badge variant="success">Đầy đủ</Badge>
                  )}
                </td>
                <td className="px-4 text-center">
                  <MissingInfoBadge items={(getArr(c, "contract_checklists") as { id: string; contract_id: string; event_stage: string | null; category: string; item_name: string; is_completed: boolean; created_at: string; updated_at: string }[])} />
                </td>
                <td className="px-4">
                  <ProgressBadge tasks={getArr(c, "work_tasks") as { id: string; work_type: string; status: string; deadline: string | null }[]} />
                </td>
                <td className="px-4">
                  <Badge variant={getStatusVariant(status)} dot>
                    {getStatusLabel(status)}
                  </Badge>
                </td>
                <td className="px-4 text-right">
                  <div className="h-8 w-8 inline-flex items-center justify-center rounded-md shadow-xs bg-bg-card text-text-secondary group-hover:bg-primary group-hover:text-white group-hover:shadow-sm transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MOBILE CARD LIST ────────────────────────────

function MobileCardList({ contracts, customerMap, onView }: ContractsTableProps) {
  return (
    <div className="lg:hidden flex flex-col gap-3 pt-1">
      {contracts.map((c, i) => {
        const id = getStr(c, "id");
        const status = getStr(c, "status") as ContractStatus;
        const isCancelled = status === "da_huy";
        const total = getNum(c, "total_amount");
        const paid = getNum(c, "paid_amount");
        const debt = getNum(c, "remaining_amount");
        const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
        const isFullyPaid = debt === 0 && total > 0;
        const customerId = getStr(c, "customer_id");
        const customer = customerMap[customerId];
        const customerName = customer?.full_name || "Khách vãng lai";
        const serviceType = getStr(c, "service_type");
        const svc = getServiceBadgeColor(serviceType);

        return (
          <button
            key={id}
            onClick={() => onView(c)}
            className={`card-base p-4 text-left transition-all active:scale-[0.99] entrance entrance-${Math.min(i + 1, 5)} ${isCancelled ? "opacity-50" : ""}`}
          >
            {/* Row 1: Mã HĐ + Status badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">
                {getStr(c, "contract_code")}
              </span>
              <Badge variant={getStatusVariant(status)} className="text-tiny">
                {getStatusLabel(status)}
              </Badge>
            </div>

            {/* Row 2: Tên khách hàng */}
            <h3 className={`text-sm font-bold text-text-main mb-1.5 truncate ${isCancelled ? "line-through" : ""}`}>
              {customerName}
            </h3>

            {/* Row 3: Service badge + Date */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-tiny px-2 py-0.5 rounded-md ${svc.bg} ${svc.text}`}>
                {getServiceLabel(serviceType as import("@/types/contract").ServiceType)}
              </span>
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Calendar className="w-3 h-3" />
                {fmtDate(getStr(c, "work_date") || getStr(c, "contract_date") || null)}
              </span>
            </div>

            {/* Row 4: Tổng tiền + Payment info */}
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-semibold text-text-main">{fmt(total)}</p>
              {isFullyPaid ? (
                <span className="flex items-center gap-1 text-tiny text-success font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Đã thanh toán
                </span>
              ) : paid > 0 ? (
                <span className="text-tiny text-text-secondary">
                  Đã thu: {fmt(paid)}
                </span>
              ) : (
                <span className="text-tiny text-text-muted">Chưa thu</span>
              )}
            </div>

            {/* Row 5: Payment progress bar */}
            <div className="h-1 rounded-full bg-border/30 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isFullyPaid ? "bg-success" : "bg-primary"}`}
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────

export function ContractsTable(props: ContractsTableProps) {
  if (props.contracts.length === 0) return (
    <EmptyState
      icon={FileText}
      title="Chưa có hợp đồng"
      description="Chưa ghi nhận hợp đồng nào phù hợp với bộ lọc hiện tại."
    />
  );
  return (
    <>
      <DesktopTable {...props} />
      <MobileCardList {...props} />
    </>
  );
}
