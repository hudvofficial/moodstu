"use client";

import { memo } from "react";
import { ChevronRight, FileText, CheckCircle, Calendar } from "lucide-react";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { TierSwitch } from "@/components/ui/tier-switch";
import { formatCurrency, formatDate, getInitials, CURRENCY_SYMBOL } from "@/lib/utils";
import { getServiceColor, getServiceBadgeColor } from "@/constants/service-colors";
import {
  CONTRACT_STATUS_MAP,
  getServiceLabel,
  getStatusLabel,
} from "@/types/contract-constants";
import type { ContractChecklistSummary, ContractStatus, Contract } from "@/types/contract";
import MissingInfoBadge from "@/components/contracts/missing-info-badge";
import type { ContractChecklistForBadge } from "@/components/contracts/missing-info-badge";
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
  contracts: Contract[];
  onView: (contract: Contract) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onHover?: (id: string) => void;
}

type ProgressTask = {
  id: string;
  work_type: string;
  status: string;
  deadline: string | null;
};

// ─── TYPE HELPERS (safe accessors for Record) ────

function getStr(obj: any, key: string): string {
  return (obj[key] as string) || "";
}

function getNum(obj: any, key: string): number {
  return Number(obj[key]) || 0;
}

function getArr(obj: any, key: string): any[] {
  const val = obj[key];
  return Array.isArray(val) ? val : [];
}

function getChecklistSummary(
  obj: any,
): ContractChecklistSummary | null {
  const value = obj.checklist_summary;
  if (!value || typeof value !== "object") return null;

  const summary = value as Record<string, unknown>;
  const total = Math.max(0, Number(summary.total) || 0);
  const done = Math.min(total, Math.max(0, Number(summary.done) || 0));
  return {
    total,
    done,
    missing: Math.min(total, Math.max(0, Number(summary.missing) || total - done)),
  };
}

// ─── DESKTOP TABLE ───────────────────────────────

const DesktopTableRow = memo(function DesktopTableRow({
  c,
  onView,
  onHover,
}: {
  c: Contract;
  onView: (contract: Contract) => void;
  onHover?: (id: string) => void;
}) {
  const id = getStr(c, "id");
  const status = getStr(c, "status") as ContractStatus;
  const isCancelled = status === "da_huy";
  const customer = c.customers as any;
  const customerName = customer?.full_name || "Khách vãng lai";
  const serviceType = getStr(c, "service_type");
  const svcBadge = getServiceBadgeColor(serviceType);

  return (
    <TR
      onClick={() => onView(c)}
      onMouseEnter={() => onHover?.(id)}
      className={isCancelled ? "opacity-50" : ""}
    >
      <TD>
        <span className="font-semibold text-text-main">
          {getStr(c, "contract_code")}
        </span>
      </TD>
      <TD>
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
      </TD>
      <TD className="text-text-secondary">
        {fmtDate(getStr(c, "contract_date") || null)}
      </TD>
      <TD className="text-right font-semibold text-text-main">
        {fmt(getNum(c, "total_amount"))}
      </TD>
      <TD className="text-right">
        {getNum(c, "remaining_amount") > 0 ? (
          <span className="font-semibold text-error">
            {fmt(getNum(c, "remaining_amount"))}
          </span>
        ) : (
          <Badge variant="success">Đầy đủ</Badge>
        )}
      </TD>
      <TD className="text-center">
        <MissingInfoBadge
          summary={getChecklistSummary(c)}
          items={
            getArr(c, "contract_checklists") as unknown as ContractChecklistForBadge[]
          }
        />
      </TD>
      <TD>
        <ProgressBadge tasks={getArr(c, "work_tasks") as ProgressTask[]} />
      </TD>
      <TD>
        <Badge variant={getStatusVariant(status)} dot>
          {getStatusLabel(status)}
        </Badge>
      </TD>
      <TD className="text-right">
        <div className="h-8 w-8 inline-flex items-center justify-center rounded-md shadow-xs bg-bg-card text-text-secondary group-hover:bg-primary group-hover:text-white group-hover:shadow-sm transition-all">
          <ChevronRight className="w-4 h-4" />
        </div>
      </TD>
    </TR>
  );
}, (prev, next) => prev.c === next.c);

const DesktopTable = memo(function DesktopTable({ contracts, onView, onHover }: ContractsTableProps) {
  return (
    // Tablet (md, 768+): hiện bảng dạng block (page tự cuộn). Desktop (lg): flex-fill + sticky scroll.
    <div className="lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
      <TableWrapper>
        <THead>
          <tr>
            <TH>Mã HĐ</TH>
            <TH>Khách hàng</TH>
            <TH>Ngày ký</TH>
            <TH className="text-right">Tổng cộng</TH>
            <TH className="text-right">Còn nợ</TH>
            <TH className="text-center">Thông tin</TH>
            <TH>Tiến độ</TH>
            <TH>Trạng thái</TH>
            <TH className="text-right">Thao tác</TH>
          </tr>
        </THead>
        <TBody>
          {contracts.map((c) => (
            <DesktopTableRow key={getStr(c, "id")} c={c} onView={onView} onHover={onHover} />
          ))}
        </TBody>
      </TableWrapper>
    </div>
  );
});

// ─── MOBILE CARD LIST ────────────────────────────

const MobileCardRow = memo(function MobileCardRow({
  c,
  index: i,
  onView,
  onHover,
}: {
  c: Contract;
  index: number;
  onView: (contract: Contract) => void;
  onHover?: (id: string) => void;
}) {
  const id = getStr(c, "id");
  const status = getStr(c, "status") as ContractStatus;
  const isCancelled = status === "da_huy";
  const total = getNum(c, "total_amount");
  const paid = getNum(c, "paid_amount");
  const debt = getNum(c, "remaining_amount");
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const isFullyPaid = debt === 0 && total > 0;
  const customer = c.customers as any;
  const customerName = customer?.full_name || "Khách vãng lai";
  const serviceType = getStr(c, "service_type");
  const svc = getServiceBadgeColor(serviceType);

  return (
    <Button unstyled
      onClick={() => onView(c)}
      onPointerEnter={() => onHover?.(id)}
      onFocus={() => onHover?.(id)}
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

      {/* Row 3.5: Task Progress */}
      <div className="mb-3">
        <ProgressBadge tasks={getArr(c, "work_tasks") as ProgressTask[]} />
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
    </Button>
  );
}, (prev, next) => prev.c === next.c);

const MobileCardList = memo(function MobileCardList({ contracts, onView, onHover }: ContractsTableProps) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      {contracts.map((c, i) => (
        <MobileCardRow key={getStr(c, "id")} c={c} index={i} onView={onView} onHover={onHover} />
      ))}
    </div>
  );
});

// ─── MAIN EXPORT ─────────────────────────────────

export const ContractsTable = memo(function ContractsTable(props: ContractsTableProps) {
  if (props.contracts.length === 0) return (
    <EmptyState
      icon={FileText}
      title="Chưa có hợp đồng"
      description="Chưa ghi nhận hợp đồng nào phù hợp với bộ lọc hiện tại."
    />
  );
  return (
    <TierSwitch
      phone={<MobileCardList {...props} />}
      desktop={<DesktopTable {...props} />}
    />
  );
});
