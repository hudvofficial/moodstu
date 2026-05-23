"use client";

import { formatFinanceDate, formatVnd, financeMethodLabel } from "@/components/finance/finance-format";
import { ExpenseRowActions } from "./expense-row-actions";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { ExpenseListItem } from "@/types/finance-operations";

interface ExpenseDesktopTableProps {
  items: ExpenseListItem[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ExpenseListItem) => void;
  onView: (id: string) => void;
  onPrint: (id: string) => void;
}

export function ExpenseDesktopTable({ items, busyId, onApprove, onDelete, onEdit, onView, onPrint }: ExpenseDesktopTableProps) {
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
            <TH className="text-right w-56">Thao tác</TH>
          </TR>
        </THead>
        <TBody>
          {items.length === 0 ? (
            <TR>
              <TD colSpan={7} className="py-8 text-center text-text-muted">
                Chưa có phiếu chi trong kỳ này.
              </TD>
            </TR>
          ) : (
            items.map((item) => (
              <TR key={item.id}>
                <TD>{formatFinanceDate(item.expense_date)}</TD>
                <TD>
                  <div className="text-label text-text-primary">{item.category_name || "Chưa phân loại"}</div>
                  <div className="text-caption text-text-muted">{item.description || "Không có mô tả"}</div>
                </TD>
                <TD>{item.recipient || "-"}</TD>
                <TD>{financeMethodLabel(item.payment_method)}</TD>
                <TD className="text-right text-amount text-error">{formatVnd(item.amount)}</TD>
                <TD>
                  <span className={item.approved_by ? "badge badge-success" : "badge badge-warning"}>
                    {item.approved_by ? "Đã duyệt" : "Chờ duyệt"}
                  </span>
                </TD>
                <TD className="text-right w-56">
                  <ExpenseRowActions
                    item={item}
                    busyId={busyId}
                    onApprove={onApprove}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onView={onView}
                    onPrint={onPrint}
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </TableWrapper>
    </div>
  );
}
