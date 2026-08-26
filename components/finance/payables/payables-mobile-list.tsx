"use client";

import { DollarSign, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { SwipeableCard, type SwipeAction } from "@/components/ui/swipeable-card";
import { PAYEE_TYPE_LABEL, type PayableRow } from "@/types/payables";

interface PayablesMobileListProps {
  items: PayableRow[];
  onPay: (item: PayableRow) => void;
  onHistory: (item: PayableRow) => void;
}

const TYPE_VARIANT: Record<PayableRow["payee_type"], "info" | "warning" | "primary" | "success"> = {
  lab: "info",
  vendor: "warning",
  supplier: "primary",
  employee: "success",
};

export function PayablesMobileList({ items, onPay, onHistory }: PayablesMobileListProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const rightActions: SwipeAction[] = [
          {
            id: "history",
            label: "Lịch sử",
            icon: <History className="mb-1 h-5 w-5" />,
            className: "bg-blue-500 text-white",
            onClick: () => onHistory(item),
          },
          {
            id: "pay",
            label: "Thanh toán",
            icon: <DollarSign className="mb-1 h-5 w-5" />,
            className: "bg-success text-white",
            onClick: () => {
              if (item.remaining > 0) onPay(item);
            },
          },
        ];

        return (
          <SwipeableCard key={`${item.payee_type}:${item.payee_id}`} rightActions={rightActions} actionWidth={144}>
            <article className="card-base space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="truncate font-bold text-text-primary">{item.payee_name}</span>
                    <Badge variant={TYPE_VARIANT[item.payee_type]}>{PAYEE_TYPE_LABEL[item.payee_type]}</Badge>
                  </div>
                  <div className="text-caption text-text-muted">
                    {item.item_count} khoản · Đã trả {formatVnd(item.total_paid)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-h3 font-bold tabular-nums text-error">{formatVnd(item.remaining)}</div>
                  <div className="text-caption text-text-muted">Còn nợ</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-caption text-text-muted">
                <span>Khoản gần nhất: {formatFinanceDate(item.last_item_date)}</span>
                <span>Trả: {formatFinanceDate(item.last_payment_date)}</span>
              </div>
            </article>
          </SwipeableCard>
        );
      })}

      {items.length === 0 && (
        <div className="card-base py-12 text-center text-text-muted">Không có công nợ phải trả.</div>
      )}
    </div>
  );
}
