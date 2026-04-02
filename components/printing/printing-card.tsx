"use client";

import { CalendarClock, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusSelect, {
  PRINT_ORDER_STATUS_OPTIONS,
} from "@/components/ui/status-select";
import { formatDate } from "@/lib/utils";
import type { PrintingOrderRow } from "@/types/printing";
import {
  PRINTING_PAYMENT_LABELS,
  PRINTING_PAYMENT_VARIANTS,
} from "@/types/printing-constants";

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}d`;
}

interface Props {
  order: PrintingOrderRow;
  onEdit: (order: PrintingOrderRow) => void;
  onStatusChange: (
    order: PrintingOrderRow,
    newStatus: string,
  ) => Promise<void>;
}

export default function PrintingCard({ order, onEdit, onStatusChange }: Props) {
  return (
    <div className="card-base p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-text-main">
            {order.orderCode}
          </p>
          <p className="text-xs text-text-muted">
            {order.contractCode} - {order.customerName}
          </p>
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
          <CalendarClock className="w-4 h-4 text-text-muted" />
          <span>
            {order.expectedDate ? formatDate(order.expectedDate) : "Chưa có ngày nhận"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <StatusSelect
          current={order.status}
          options={[...PRINT_ORDER_STATUS_OPTIONS]}
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

