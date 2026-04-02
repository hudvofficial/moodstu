"use client";

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
  orders: PrintingOrderRow[];
  onEdit: (order: PrintingOrderRow) => void;
  onStatusChange: (
    order: PrintingOrderRow,
    newStatus: string,
  ) => Promise<void>;
}

export default function PrintingTable({
  orders,
  onEdit,
  onStatusChange,
}: Props) {
  return (
    <TableWrapper containerClassName="hidden lg:block">
      <THead>
        <TR className="hover:bg-transparent h-auto">
          <TH>Đơn in</TH>
          <TH>Hợp đồng</TH>
          <TH>Lab</TH>
          <TH>Tổng tiền</TH>
          <TH>Trạng thái</TH>
          <TH>Thanh toán</TH>
          <TH>Ngày dự kiến</TH>
          <TH className="text-right">Hành động</TH>
        </TR>
      </THead>

      <TBody>
        {orders.map((order) => (
          <TR key={order.id}>
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
              {order.expectedDate ? formatDate(order.expectedDate) : "Chưa có"}
            </TD>
            <TD className="text-right">
              <Button size="sm" variant="outline" onClick={() => onEdit(order)}>
                Sửa
              </Button>
            </TD>
          </TR>
        ))}
      </TBody>
    </TableWrapper>
  );
}

