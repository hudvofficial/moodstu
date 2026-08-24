"use client";

import { AlertTriangle, CalendarClock, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusSelect, {
  selectablePrintOrderStatusOptions,
} from "@/components/ui/status-select";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PrintingOrderRow } from "@/types/printing";
import {
  PRINTING_PAYMENT_LABELS,
  PRINTING_PAYMENT_VARIANTS,
  isPendingPrintStatus,
} from "@/types/printing-constants";



interface Props {
  order: PrintingOrderRow;
  /** Hide contract info when rendered inside a group header */
  compact?: boolean;
  onEdit: (order: PrintingOrderRow) => void;
  onStatusChange: (
    order: PrintingOrderRow,
    newStatus: string,
  ) => Promise<void>;
}

export default function PrintingCard({ order, compact, onEdit, onStatusChange }: Props) {
  const isPending = isPendingPrintStatus(order.status);
  const isOverdue = isPending && !!order.expectedDate && new Date(order.expectedDate) < new Date();
  const isMissingDate = isPending && !order.expectedDate;

  return (
    <div className={`${compact ? "bg-bg-main shadow-xs rounded-lg p-3" : "card-base p-4 hover-lift"} space-y-2.5 ${isOverdue ? "border-l-2 border-error" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-main">
            {order.orderCode}
          </p>
          {!compact && (
            <p className="text-xs text-text-muted">
              {order.contractCode} - {order.customerName}
            </p>
          )}
        </div>
        <Badge variant={PRINTING_PAYMENT_VARIANTS[order.paymentStatus]}>
          {PRINTING_PAYMENT_LABELS[order.paymentStatus]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-text-muted" />
          <span>{order.labName || "Chưa chọn lab"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-text-muted" />
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOverdue ? (
            <AlertTriangle className="w-4 h-4 text-error" />
          ) : (
            <CalendarClock className={`w-4 h-4 ${isMissingDate ? "text-warning" : "text-text-muted"}`} />
          )}
          <span className={isOverdue ? "text-error font-semibold" : isMissingDate ? "text-warning" : ""}>
            {order.expectedDate ? formatDate(order.expectedDate) : "Chưa hẹn ngày"}
            {isOverdue && " · Quá hạn"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <StatusSelect
          current={order.status}
          options={selectablePrintOrderStatusOptions(order.status)}
          variant="compact"
          onUpdate={(newStatus) => onStatusChange(order, newStatus)}
        />
        <Button size="sm" variant="outline" onClick={() => onEdit(order)}>
          Sửa
        </Button>
      </div>
    </div>
  );
}

