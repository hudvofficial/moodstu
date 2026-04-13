"use client";

import { Check, Trash2 } from "lucide-react";
import { formatFinanceDate, formatVnd, financeMethodLabel } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { ExpenseListItem } from "@/types/finance-operations";

interface ExpenseDesktopTableProps {
  items: ExpenseListItem[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ExpenseDesktopTable({ items, busyId, onApprove, onDelete }: ExpenseDesktopTableProps) {
  return (
    <div className="hidden lg:block">
      <TableWrapper>
        <THead>
          <TR>
            <TH>Ngày chi</TH>
            <TH>Nội dung</TH>
            <TH>Người nhận</TH>
            <TH>Phương thức</TH>
            <TH className="text-right">Số tiền</TH>
            <TH>Duyệt</TH>
            <TH className="text-right">Thao tác</TH>
          </TR>
        </THead>
        <TBody>
          {items.length === 0 ? (
            <TR>
              <TD colSpan={7} className="py-7 text-center text-text-muted">
                Chưa có phiếu chi trong kỳ này.
              </TD>
            </TR>
          ) : (
            items.map((item) => (
              <TR key={item.id}>
                <TD>{formatFinanceDate(item.expense_date)}</TD>
                <TD>
                  <div className="font-semibold text-text-primary">{item.category_name || "Chưa phân loại"}</div>
                  <div className="text-caption text-text-muted">{item.description || "Không có mô tả"}</div>
                </TD>
                <TD>{item.recipient || "-"}</TD>
                <TD>{financeMethodLabel(item.payment_method)}</TD>
                <TD className="text-right tabular-nums font-bold text-error">{formatVnd(item.amount)}</TD>
                <TD>
                  <span className={item.approved_by ? "badge badge-success" : "badge badge-warning"}>
                    {item.approved_by ? "Đã duyệt" : "Chờ duyệt"}
                  </span>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    {!item.approved_by && (
                      <Button
                        type="button"
                        variant="interactive"
                        size="sm"
                        onClick={() => onApprove(item.id)}
                        disabled={busyId === item.id}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                      disabled={busyId === item.id}
                      className="text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </TableWrapper>
    </div>
  );
}
