"use client";

import { memo, useCallback, useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusSelect, {
  PRINT_ORDER_STATUS_OPTIONS,
} from "@/components/ui/status-select";
import {
  TableWrapper,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PrintingOrderRow } from "@/types/printing";
import type { ContractGroup } from "@/lib/utils/printing-group-utils";
import {
  PRINTING_PAYMENT_LABELS,
  PRINTING_PAYMENT_VARIANTS,
  isPendingPrintStatus,
} from "@/types/printing-constants";

// ═══════════════════════════════════════════
// PrintingTable — Desktop grouped table
// Pattern: service-table.tsx expandable row
// ═══════════════════════════════════════════

interface Props {
  orders: PrintingOrderRow[];
  groups?: ContractGroup[];
  onEdit: (order: PrintingOrderRow) => void;
  onStatusChange: (
    order: PrintingOrderRow,
    newStatus: string,
  ) => Promise<void>;
}

function PrintingTableInner({
  orders,
  groups,
  onEdit,
  onStatusChange,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleGroup = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Flat mode columns (includes "Hợp đồng")
  const isGrouped = !!groups && groups.length > 0;

  return (
    <TableWrapper containerClassName="hidden lg:block">
      <THead>
        <TR className="hover:bg-transparent h-auto">
          {isGrouped && <TH className="w-10" />}
          <TH>Đơn in</TH>
          {!isGrouped && <TH>Hợp đồng</TH>}
          <TH>Lab</TH>
          <TH>Tổng tiền</TH>
          <TH>Trạng thái</TH>
          <TH>Thanh toán</TH>
          <TH>Ngày dự kiến</TH>
          <TH className="text-right">Hành động</TH>
        </TR>
      </THead>

      <TBody>
        {isGrouped
          ? groups.map((group) => (
              <ContractGroupRows
                key={group.contractCode}
                group={group}
                isExpanded={expanded.has(group.contractCode)}
                onToggle={() => toggleGroup(group.contractCode)}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
              />
            ))
          : orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                showContract
                onEdit={() => onEdit(order)}
                onStatusChange={onStatusChange}
              />
            ))}
      </TBody>
    </TableWrapper>
  );
}

// ── Contract Group Header + Child Rows ────────

interface ContractGroupProps {
  group: ContractGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (order: PrintingOrderRow) => void;
  onStatusChange: (order: PrintingOrderRow, newStatus: string) => Promise<void>;
}

const ContractGroupRows = memo(function ContractGroupRows({
  group,
  isExpanded,
  onToggle,
  onEdit,
  onStatusChange,
}: ContractGroupProps) {
  const colSpan = 8; // chevron + 7 data columns

  return (
    <>
      {/* Contract Header Row */}
      <TR
        onClick={onToggle}
        className="bg-bg-subtle/50 hover:bg-bg-hover cursor-pointer"
      >
        <TD className="w-10 text-center">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </TD>
        <td colSpan={colSpan - 1} className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-text-main">
                {group.contractCode}
              </span>
              <span className="text-sm text-text-secondary">
                {group.customerName}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-text-muted">
                {group.orderCount} đơn
              </span>
              <span className="font-semibold text-text-main">
                {formatCurrency(group.totalAmount)}
              </span>
              {group.completedCount > 0 && (
                <span className="text-success text-xs">
                  {group.completedCount}/{group.orderCount} hoàn thành
                </span>
              )}
              {group.overdueCount > 0 && (
                <span className="flex items-center gap-1 text-error text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  {group.overdueCount} quá hạn
                </span>
              )}
            </div>
          </div>
        </td>
      </TR>

      {/* Child Order Rows */}
      {isExpanded &&
        group.orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            showContract={false}
            onEdit={() => onEdit(order)}
            onStatusChange={onStatusChange}
          />
        ))}
    </>
  );
});

// ── Single Order Row ──────────────────────────

interface OrderRowProps {
  order: PrintingOrderRow;
  showContract: boolean;
  onEdit: () => void;
  onStatusChange: (order: PrintingOrderRow, newStatus: string) => Promise<void>;
}

const OrderRow = memo(function OrderRow({
  order,
  showContract,
  onEdit,
  onStatusChange,
}: OrderRowProps) {
  const isPending = isPendingPrintStatus(order.status);
  const isOverdue =
    isPending &&
    !!order.expectedDate &&
    new Date(order.expectedDate) < new Date();
  const isMissingDate = isPending && !order.expectedDate;

  return (
    <TR className={isOverdue ? "bg-error/5" : ""}>
      {!showContract && <TD className="w-10">{""}</TD>}
      <TD>
        <div className="flex flex-col">
          <span className="font-semibold text-text-main">
            {order.orderCode}
          </span>
          <span className="text-xs text-text-muted">
            {order.items.length} hạng mục
          </span>
        </div>
      </TD>
      {showContract && (
        <TD>
          <div className="flex flex-col">
            <span className="font-medium text-text-main">
              {order.contractCode}
            </span>
            <span className="text-xs text-text-muted">
              {order.customerName}
            </span>
          </div>
        </TD>
      )}
      <TD>{order.labName || "Chưa chọn"}</TD>
      <TD className="font-semibold text-text-main">
        {formatCurrency(order.totalAmount)}
      </TD>
      <TD>
        <StatusSelect
          current={order.status}
          options={[...PRINT_ORDER_STATUS_OPTIONS]}
          variant="compact"
          onUpdate={(newStatus) => onStatusChange(order, newStatus)}
        />
      </TD>
      <TD>
        <Badge variant={PRINTING_PAYMENT_VARIANTS[order.paymentStatus]}>
          {PRINTING_PAYMENT_LABELS[order.paymentStatus]}
        </Badge>
      </TD>
      <TD>
        <span
          className={
            isOverdue
              ? "text-error font-semibold"
              : isMissingDate
                ? "text-warning"
                : ""
          }
        >
          {order.expectedDate ? formatDate(order.expectedDate) : "Chưa hẹn"}
          {isOverdue && " · Quá hạn"}
        </span>
      </TD>
      <TD className="text-right">
        <Button size="sm" variant="outline" onClick={onEdit}>
          Sửa
        </Button>
      </TD>
    </TR>
  );
});

export default memo(PrintingTableInner);
