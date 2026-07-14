"use client";

import { memo, useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/ux-states";
import MissingInfoBadge from "@/components/contracts/missing-info-badge";
import type { ContractChecklistForBadge } from "@/components/contracts/missing-info-badge";
import ProgressBadge from "@/components/contracts/progress-badge";
import { ContractMilestones } from "@/components/contracts/contract-milestones";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { getServiceBadgeColor } from "@/constants/service-colors";
import { formatCurrency, formatDate, getInitials, CURRENCY_SYMBOL } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
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
  // Pagination props
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  total?: number;
  visibleStart?: number;
  visibleEnd?: number;
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
    missing: Math.max(0, total - done), // Force canonical missing instead of trusting RPC missing
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
      onPointerDown={() => onHover?.(id)}
      className={`h-16 group cursor-pointer ${isCancelled ? "opacity-50" : ""}`}
    >
      <TD className="sticky left-0 z-10 w-[124px] bg-surface group-even:bg-bg-base/40 group-hover:bg-bg-hover transition-colors py-4 px-3 font-semibold text-text-main border-r border-border">
        <span className="block truncate">{getStr(c, "contract_code")}</span>
      </TD>
      <TD className="w-[220px] py-4 px-3">
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
            <ContractMilestones contract={c} compact className="mt-1.5" />
          </div>
        </div>
      </TD>
      <TD className="w-[170px] py-4 px-3 text-right">
        <div className="truncate font-semibold text-text-main">{fmt(getNum(c, "total_amount"))}</div>
        {remainingAmount > 0 ? (
          <div className="mt-1 truncate text-xs font-semibold text-error">Nợ {fmt(remainingAmount)}</div>
        ) : (
          <div className="mt-1 text-xs font-semibold text-success">Đầy đủ</div>
        )}
      </TD>
      <TD className="w-[238px] py-3 px-3">
        <TabletStatusCell contract={c} status={status} />
      </TD>
      <TD className="sticky right-0 z-10 w-[48px] bg-surface group-even:bg-bg-base/40 group-hover:bg-bg-hover transition-colors py-3 px-2 text-center border-l border-border">
        <div className="inline-flex size-8 items-center justify-center rounded-md bg-bg-card text-text-secondary shadow-xs transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-sm">
          <ChevronRight className="size-4" />
        </div>
      </TD>
    </TR>
  );
}, (prev, next) =>
  prev.c.id === next.c.id &&
  prev.c.status === next.c.status &&
  prev.c.total_amount === next.c.total_amount &&
  prev.c.remaining_amount === next.c.remaining_amount &&
  prev.c.paid_amount === next.c.paid_amount &&
  prev.c.contract_code === next.c.contract_code &&
  prev.c.contract_date === next.c.contract_date &&
  prev.c.service_type === next.c.service_type &&
  prev.c.customers?.full_name === next.c.customers?.full_name &&
  JSON.stringify(prev.c.checklist_summary) === JSON.stringify(next.c.checklist_summary) &&
  JSON.stringify(prev.c.contract_checklists) === JSON.stringify(next.c.contract_checklists) &&
  JSON.stringify(prev.c.contract_events) === JSON.stringify(next.c.contract_events) &&
  prev.c.work_date === next.c.work_date &&
  (prev.c.customers as { wedding_date?: string | null } | null)?.wedding_date === (next.c.customers as { wedding_date?: string | null } | null)?.wedding_date
);

function TabletStatusCell({
  contract,
  status,
}: {
  contract: Contract;
  status: ContractStatus;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="shrink-0">
        <MissingInfoBadge
          summary={getChecklistSummary(contract)}
          items={getArr(contract, "contract_checklists") as ContractChecklistForBadge[]}
        />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden [&>div]:min-w-0">
        <ProgressBadge tasks={getArr(contract, "work_tasks") as ProgressTask[]} />
      </div>
      <div className="shrink-0 max-w-[82px] truncate [&_.badge]:px-2 [&_.badge]:py-1 [&_.badge]:text-tiny">
        <Badge variant={getStatusVariant(status)} dot>
          {getStatusLabel(status)}
        </Badge>
      </div>
    </div>
  );
}

export const ContractsTabletTable = memo(function ContractsTabletTable({
  contracts,
  onView,
  onHover,
  page,
  totalPages,
  onPageChange,
  total,
  visibleStart,
  visibleEnd,
}: ContractsTabletTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ref được gắn sau khi component mount
    if (tableContainerRef.current) {
      setMounted(true);
    }
  }, []);

  const virtualizer = useVirtualizer({
    count: contracts.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  // KEY: force re-measure khi mounted
  useEffect(() => {
    if (mounted) {
      virtualizer.measure();
    }
  }, [mounted]);

  if (contracts.length === 0) return (
    <EmptyState
      icon={FileText}
      title="Chưa có hợp đồng"
      description="Chưa ghi nhận hợp đồng nào phù hợp với bộ lọc hiện tại."
    />
  );

  const items = virtualizer.getVirtualItems();

  return (
    <TableWrapper
      scrollRef={tableContainerRef}
      className="min-w-[800px] table-fixed"
      containerClassName="rounded-xl"
      footer={
        totalPages !== undefined && totalPages > 1 && onPageChange ? (
          <div className="bg-bg-card border-t border-border px-5 py-3.5 flex items-center justify-between shrink-0">
            <p className="text-xs text-text-muted md:text-sm italic">
              <span className="font-semibold italic text-primary">{visibleStart}-{visibleEnd}</span>
              <span className="text-text-muted"> / {total} hợp đồng</span>
            </p>
            <Pagination
              page={page || 1}
              totalPages={totalPages}
              onChange={onPageChange}
              compact
              variant="footer"
            />
          </div>
        ) : null
      }
    >
        <THead>
          <tr>
            <TH className="sticky left-0 z-20 w-[124px] bg-bg-sidebar border-r border-border px-3">Mã HĐ</TH>
            <TH className="w-[220px] px-3">Khách hàng / Ngày ký</TH>
            <TH className="w-[170px] px-3 text-right">Tổng cộng / Còn nợ</TH>
            <TH className="w-[238px] px-3">Tình trạng</TH>
            <TH className="sticky right-0 z-20 w-[48px] bg-bg-sidebar text-center border-l border-border px-2">Đi</TH>
          </tr>
        </THead>
        <TBody>
          {items[0]?.start > 0 && <tr><td style={{ height: items[0].start }} /></tr>}
          {items.map((virtualRow) => {
            const contract = contracts[virtualRow.index];
            return <TabletTableRow key={virtualRow.key} c={contract} onView={onView} onHover={onHover} />;
          })}
          {items[items.length - 1]?.end < virtualizer.getTotalSize() && (
            <tr><td style={{ height: virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0) }} /></tr>
          )}
        </TBody>
      </TableWrapper>
  );
});
