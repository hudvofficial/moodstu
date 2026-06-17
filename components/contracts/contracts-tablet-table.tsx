"use client";

import { memo } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/ux-states";
import MissingInfoBadge from "@/components/contracts/missing-info-badge";
import type { ContractChecklistForBadge } from "@/components/contracts/missing-info-badge";
import ProgressBadge from "@/components/contracts/progress-badge";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { getServiceBadgeColor } from "@/constants/service-colors";
import { formatCurrency, formatDate, getInitials, CURRENCY_SYMBOL } from "@/lib/utils";
import {
  CONTRACT_STATUS_MAP,
  getServiceLabel,
  getStatusLabel,
} from "@/types/contract-constants";
import type { Contract, ContractChecklistSummary, ContractStatus, ServiceType } from "@/types/contract";

interface ContractsTabletTableProps {
  contracts: Contract[];
  onView: (contract: Contract) => void;
  onHover?: (id: string) => void;
}

type ProgressTask = {
  id: string;
  work_type: string;
  status: string;
  deadline: string | null;
};

function fmt(amount: number): string {
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  return formatDate(dateStr);
}

function getStr(obj: unknown, key: string): string {
  if (!obj || typeof obj !== "object") return "";
  return ((obj as Record<string, unknown>)[key] as string) || "";
}

function getNum(obj: unknown, key: string): number {
  if (!obj || typeof obj !== "object") return 0;
  return Number((obj as Record<string, unknown>)[key]) || 0;
}

function getArr(obj: unknown, key: string): unknown[] {
  if (!obj || typeof obj !== "object") return [];
  const val = (obj as Record<string, unknown>)[key];
  return Array.isArray(val) ? val : [];
}

function getChecklistSummary(obj: unknown): ContractChecklistSummary | null {
  if (!obj || typeof obj !== "object") return null;
  const value = (obj as Record<string, unknown>).checklist_summary;
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

function getStatusVariant(status: ContractStatus): "info" | "warning" | "success" | "error" {
  return CONTRACT_STATUS_MAP[status]?.variant || "info";
}

const TabletTableRow = memo(function TabletTableRow({
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
  const customer = c.customers as { full_name?: string } | null;
  const customerName = customer?.full_name || "Khách vãng lai";
  const serviceType = getStr(c, "service_type");
  const serviceBadge = getServiceBadgeColor(serviceType);
  const remainingAmount = getNum(c, "remaining_amount");

  return (
    <TR
      onClick={() => onView(c)}
      onMouseEnter={() => onHover?.(id)}
      className={`h-16 group cursor-pointer ${isCancelled ? "opacity-50" : ""}`}
    >
      <TD className="sticky left-0 z-10 w-[124px] bg-surface group-even:bg-bg-base/40 group-hover:bg-bg-hover transition-colors py-4 px-3 font-semibold text-text-main border-r border-border">
        <span className="block truncate">{getStr(c, "contract_code")}</span>
      </TD>
      <TD className="w-[176px] py-4 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${serviceBadge.bg} ${serviceBadge.text}`}>
            {getInitials(customerName)}
          </div>
          <div className="min-w-0">
            <div className={`truncate font-semibold text-text-main ${isCancelled ? "line-through" : ""}`}>
              {customerName}
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
              <span className="shrink-0">{fmtDate(getStr(c, "contract_date") || null)}</span>
              <span className={`truncate rounded-md px-1.5 py-0.5 ${serviceBadge.bg} ${serviceBadge.text}`}>
                {getServiceLabel(serviceType as ServiceType)}
              </span>
            </div>
          </div>
        </div>
      </TD>
      <TD className="w-[148px] py-4 px-3 text-right">
        <div className="truncate font-semibold text-text-main">{fmt(getNum(c, "total_amount"))}</div>
        {remainingAmount > 0 ? (
          <div className="mt-1 truncate text-xs font-semibold text-error">Nợ {fmt(remainingAmount)}</div>
        ) : (
          <div className="mt-1 text-xs font-semibold text-success">Đầy đủ</div>
        )}
      </TD>
      <TD className="w-[96px] py-4 px-2 text-center">
        <div className="flex justify-center">
          <MissingInfoBadge
            summary={getChecklistSummary(c)}
            items={getArr(c, "contract_checklists") as ContractChecklistForBadge[]}
          />
        </div>
      </TD>
      <TD className="w-[104px] py-4 px-2">
        <div className="max-w-[96px]">
          <ProgressBadge tasks={getArr(c, "work_tasks") as ProgressTask[]} />
        </div>
      </TD>
      <TD className="w-[120px] py-4 px-2">
        <div className="max-w-[112px] truncate">
          <Badge variant={getStatusVariant(status)} dot>
            {getStatusLabel(status)}
          </Badge>
        </div>
      </TD>
      <TD className="sticky right-0 z-10 w-[80px] bg-surface group-even:bg-bg-base/40 group-hover:bg-bg-hover transition-colors py-4 px-3 text-right border-l border-border">
        <div className="inline-flex size-9 items-center justify-center rounded-lg bg-bg-card text-text-secondary shadow-xs transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-sm">
          <ChevronRight className="size-4" />
        </div>
      </TD>
    </TR>
  );
}, (prev, next) => prev.c === next.c);

export const ContractsTabletTable = memo(function ContractsTabletTable({
  contracts,
  onView,
  onHover,
}: ContractsTabletTableProps) {
  if (contracts.length === 0) return (
    <EmptyState
      icon={FileText}
      title="Chưa có hợp đồng"
      description="Chưa ghi nhận hợp đồng nào phù hợp với bộ lọc hiện tại."
    />
  );

  return (
    <TableWrapper className="min-w-[860px] table-fixed" containerClassName="rounded-xl">
        <THead>
          <tr>
            <TH className="sticky left-0 z-20 w-[124px] bg-bg-sidebar border-r border-border px-3">Mã HĐ</TH>
            <TH className="w-[176px] px-3">Khách hàng / Ngày ký</TH>
            <TH className="w-[148px] px-3 text-right">Tổng cộng / Còn nợ</TH>
            <TH className="w-[96px] px-2 text-center">Thông tin</TH>
            <TH className="w-[104px] px-2">Tiến độ</TH>
            <TH className="w-[120px] px-2">Trạng thái</TH>
            <TH className="sticky right-0 z-20 w-[80px] bg-bg-sidebar text-center border-l border-border px-3">Thao tác</TH>
          </tr>
        </THead>
        <TBody>
          {contracts.map((contract) => (
            <TabletTableRow
              key={getStr(contract, "id")}
              c={contract}
              onView={onView}
              onHover={onHover}
            />
          ))}
        </TBody>
      </TableWrapper>
  );
});
