"use client";

import { formatFinanceDate, formatVnd, financeMethodLabel, financeStatusLabel, financeStatusVariant, financeReceiptTypeLabel, financeReceiptTypeVariant } from "@/components/finance/finance-format";
import { ReceiptRowActions } from "@/components/finance/receipts/receipt-row-actions";
import type { ReceiptListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface ReceiptMobileListProps {
  items: ReceiptListItem[];
  bankInfo: BankInfo | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onEdit: (receipt: ReceiptListItem) => void;
}

export function ReceiptMobileList({ items, bankInfo, deletingId, onDelete, onEdit }: ReceiptMobileListProps) {
  return (
    <div className="space-y-3 lg:hidden">
      {items.length === 0 ? (
        <div className="card-base p-5 text-center text-text-muted">
          Chưa có phiếu thu trong kỳ này.
        </div>
      ) : (
        items.map((item) => (
          <article key={item.id} className="card-base p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-body-sm font-bold mb-1.5">{item.category_name || financeReceiptTypeLabel(item.receipt_type)}</div>
                <div className="flex items-center gap-2">
                  <span className={`badge badge-${financeReceiptTypeVariant(item.receipt_type)}`}>
                    {financeReceiptTypeLabel(item.receipt_type)}
                  </span>
                  <span className="text-caption text-text-muted">{formatFinanceDate(item.receipt_date)}</span>
                </div>
              </div>
              <span className={`badge badge-${financeStatusVariant(item.status)}`}>
                {financeStatusLabel(item.status)}
              </span>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="text-body-sm text-text-secondary">
                <div>{item.contract_code || "Thu khác"}</div>
                <div>{financeMethodLabel(item.payment_type)}</div>
              </div>
              <div className="text-amount tabular-nums text-right text-success">{formatVnd(item.receipt_amount)}</div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-caption text-text-muted truncate max-w-[250px]">{item.notes || ""}</div>
              <ReceiptRowActions receipt={item} bankInfo={bankInfo} deletingId={deletingId} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </article>
        ))
      )}
    </div>
  );
}
