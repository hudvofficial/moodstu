"use client";

import { Trash2 } from "lucide-react";
import { formatFinanceDate, formatVnd, financeMethodLabel, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { ReceiptListItem } from "@/types/finance-operations";

interface ReceiptDesktopTableProps {
  items: ReceiptListItem[];
  deletingId: string | null;
  onDelete: (id: string) => void;
}

export function ReceiptDesktopTable({ items, deletingId, onDelete }: ReceiptDesktopTableProps) {
  return (
    <div className="hidden lg:block">
      <TableWrapper>
        <THead>
          <TR>
            <TH>Ngày thu</TH>
            <TH>Nội dung</TH>
            <TH>Hợp đồng</TH>
            <TH>Phương thức</TH>
            <TH className="text-right">Số tiền</TH>
            <TH>Trạng thái</TH>
            <TH className="text-right">Thao tác</TH>
          </TR>
        </THead>
        <TBody>
          {items.length === 0 ? (
            <TR>
              <TD colSpan={7} className="py-7 text-center text-text-muted">
                Chưa có phiếu thu trong kỳ này.
              </TD>
            </TR>
          ) : (
            items.map((item) => (
              <TR key={item.id}>
                <TD>{formatFinanceDate(item.receipt_date)}</TD>
                <TD>
                  <div className="font-semibold text-text-primary">{item.receipt_type}</div>
                  <div className="text-caption text-text-muted">{item.category_name || item.notes || "Không có ghi chú"}</div>
                </TD>
                <TD>
                  <div className="font-medium">{item.contract_code || "-"}</div>
                  <div className="text-caption text-text-muted">{item.customer_name || ""}</div>
                </TD>
                <TD>{financeMethodLabel(item.payment_type)}</TD>
                <TD className="text-right tabular-nums font-bold text-success">{formatVnd(item.receipt_amount)}</TD>
                <TD>
                  <span className={`badge badge-${financeStatusVariant(item.status)}`}>
                    {financeStatusLabel(item.status)}
                  </span>
                </TD>
                <TD className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </TableWrapper>
    </div>
  );
}
