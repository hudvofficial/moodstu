"use client";

import { formatFinanceDate, formatVnd, financeMethodLabel, financeStatusLabel, financeStatusVariant, financeReceiptTypeLabel, financeReceiptTypeVariant } from "@/components/finance/finance-format";
import { ReceiptRowActions } from "@/components/finance/receipts/receipt-row-actions";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { ReceiptListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface ReceiptDesktopTableProps {
  items: ReceiptListItem[];
  bankInfo: BankInfo | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onEdit: (receipt: ReceiptListItem) => void;
}

export function ReceiptDesktopTable({ items, bankInfo, deletingId, onDelete, onEdit }: ReceiptDesktopTableProps) {
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
            <TH className="text-right w-56">Thao tác</TH>
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
                  <div className="text-body-sm font-medium mb-1.5">
                    {item.category_name || financeReceiptTypeLabel(item.receipt_type)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge badge-${financeReceiptTypeVariant(item.receipt_type)}`}>
                      {financeReceiptTypeLabel(item.receipt_type)}
                    </span>
                    {item.notes && <span className="text-caption text-text-muted max-w-[200px] truncate">{item.notes}</span>}
                  </div>
                </TD>
                <TD>
                  <div className="text-label">{item.contract_code || "-"}</div>
                  <div className="text-caption text-text-muted">{item.customer_name || ""}</div>
                </TD>
                <TD>{financeMethodLabel(item.payment_type)}</TD>
                <TD className="text-right text-amount tabular-nums text-success">{formatVnd(item.receipt_amount)}</TD>
                <TD>
                  <span className={`badge badge-${financeStatusVariant(item.status)}`}>
                    {financeStatusLabel(item.status)}
                  </span>
                </TD>
                <TD className="text-right w-56">
                  <ReceiptRowActions receipt={item} bankInfo={bankInfo} deletingId={deletingId} onEdit={onEdit} onDelete={onDelete} />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </TableWrapper>
    </div>
  );
}
