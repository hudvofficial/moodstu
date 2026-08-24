"use client";

import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusSelect, {
  selectablePrintOrderStatusOptions,
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
  onViewGroup?: (group: ContractGroup) => void;
  onEdit: (order: PrintingOrderRow) => void;
  onStatusChange: (
    order: PrintingOrderRow,
    newStatus: string,
  ) => Promise<void>;
}

function PrintingTableInner({
  orders,
  groups,
  onViewGroup,
  onEdit,
  onStatusChange,
}: Props) {
  const isGrouped = !!groups && groups.length > 0;

  return (
    <TableWrapper>
      <THead>
        <TR className="hover:bg-transparent h-auto">
          <TH>Đơn in</TH>
          <TH>Hợp đồng</TH>
          <TH>Lab</TH>
          <TH>Tổng tiền</TH>
          <TH className="w-48">Tiến độ in ấn</TH>
          <TH>Thanh toán (Lab)</TH>
          <TH>Ngày dự kiến</TH>
          <TH className="text-right">Hành động</TH>
        </TR>
      </THead>

      <TBody>
        {isGrouped
          ? groups.map((group) => (
              <ContractGroupRow
                key={group.contractCode}
                group={group}
                onClick={onViewGroup}
              />
            ))
          : orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                showContract
                onEdit={onEdit}
                onStatusChange={onStatusChange}
              />
            ))}
      </TBody>
    </TableWrapper>
  );
}

// ── Contract Group Row (Drawer Trigger) ────────

interface ContractGroupProps {
  group: ContractGroup;
  onClick?: (group: ContractGroup) => void;
}

const ContractGroupRow = memo(function ContractGroupRow({
  group,
  onClick,
}: ContractGroupProps) {
  return (
    <TR
      onClick={() => onClick?.(group)}
      className="bg-bg-main hover:bg-bg-subtle cursor-pointer group transition-colors"
    >
      <TD colSpan={2}>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-text-main group-hover:text-primary transition-colors">
            {group.contractCode}
          </span>
          <span className="text-sm text-text-secondary line-clamp-1">
            {group.customerName}
          </span>
        </div>
      </TD>
      <TD>
        <span className="text-sm text-text-muted">
          {group.orderCount} đơn
        </span>
      </TD>
      <TD className="font-semibold text-text-main">
        {formatCurrency(group.totalAmount)}
      </TD>
      <TD>
        <div className="flex flex-col gap-1.5 w-32">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={group.completedCount === group.orderCount ? "text-success" : "text-text-main"}>
              {group.completedCount}/{group.orderCount} xong
            </span>
            {group.overdueCount > 0 && (
              <span className="flex items-center gap-1 text-error">
                <AlertTriangle className="w-3 h-3" />
                {group.overdueCount} trễ
              </span>
            )}
          </div>
          <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                group.completedCount === group.orderCount ? "bg-success" : 
                group.overdueCount > 0 ? "bg-error" : "bg-primary"
              }`}
              style={{ width: `${Math.max(5, (group.completedCount / group.orderCount) * 100)}%` }}
            />
          </div>
        </div>
      </TD>
      <TD>
        <Badge variant={PRINTING_PAYMENT_VARIANTS[group.paymentStatus]} className="whitespace-nowrap">
          {PRINTING_PAYMENT_LABELS[group.paymentStatus]}
        </Badge>
      </TD>
      <TD>
        {group.nearestExpectedDate ? (
          <span className="text-sm text-text-muted font-medium bg-surface px-2 py-1 rounded-md">
            {formatDate(group.nearestExpectedDate)}
          </span>
        ) : (
          <span className="text-sm text-text-disabled">—</span>
        )}
      </TD>
      <TD className="text-right">
         <span className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
           Xem chi tiết &rarr;
         </span>
      </TD>
    </TR>
  );
});

// ── Single Order Row ──────────────────────────

interface OrderRowProps {
  order: PrintingOrderRow;
  showContract: boolean;
  onEdit: (order: PrintingOrderRow) => void;
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
          options={selectablePrintOrderStatusOptions(order.status)}
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
        <Button size="sm" variant="outline" onClick={() => onEdit(order)}>
          Sửa
        </Button>
      </TD>
    </TR>
  );
});

export default memo(PrintingTableInner);
