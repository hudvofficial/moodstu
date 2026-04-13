"use client";

import { Trash2 } from "lucide-react";
import { formatFinanceDate, formatVnd, financeMethodLabel, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import type { ReceiptListItem } from "@/types/finance-operations";

interface ReceiptMobileListProps {
  items: ReceiptListItem[];
  deletingId: string | null;
  onDelete: (id: string) => void;
}

export function ReceiptMobileList({ items, deletingId, onDelete }: ReceiptMobileListProps) {
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
                <div className="text-label text-text-primary">{item.receipt_type}</div>
                <div className="text-caption text-text-muted">{formatFinanceDate(item.receipt_date)}</div>
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
              <div className="text-amount text-success">{formatVnd(item.receipt_amount)}</div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="tag-badge">{item.category_name || "Chưa phân loại"}</span>
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
            </div>
          </article>
        ))
      )}
    </div>
  );
}
