"use client";

import { Check, Trash2 } from "lucide-react";
import { formatFinanceDate, formatVnd, financeMethodLabel } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import type { ExpenseListItem } from "@/types/finance-operations";

interface ExpenseMobileListProps {
  items: ExpenseListItem[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ExpenseMobileList({ items, busyId, onApprove, onDelete }: ExpenseMobileListProps) {
  return (
    <div className="space-y-3 lg:hidden">
      {items.length === 0 ? (
        <div className="card-base p-5 text-center text-text-muted">
          Chưa có phiếu chi trong kỳ này.
        </div>
      ) : (
        items.map((item) => (
          <article key={item.id} className="card-base p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-label text-text-primary">{item.category_name || "Chưa phân loại"}</div>
                <div className="text-caption text-text-muted">{formatFinanceDate(item.expense_date)}</div>
              </div>
              <span className={item.approved_by ? "badge badge-success" : "badge badge-warning"}>
                {item.approved_by ? "Đã duyệt" : "Chờ duyệt"}
              </span>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="text-body-sm text-text-secondary">
                <div>{item.recipient || "Không có người nhận"}</div>
                <div>{financeMethodLabel(item.payment_method)}</div>
              </div>
              <div className="text-amount text-error">{formatVnd(item.amount)}</div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-text-muted">{item.description || "Không có mô tả"}</span>
              <div className="flex gap-2">
                {!item.approved_by && (
                  <Button type="button" variant="interactive" size="sm" onClick={() => onApprove(item.id)} disabled={busyId === item.id}>
                    <Check className="w-4 h-4" />
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(item.id)} disabled={busyId === item.id} className="text-error">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
