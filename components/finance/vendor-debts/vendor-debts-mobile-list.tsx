"use client";

import { DollarSign, Phone } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { SwipeableCard, type SwipeAction } from "@/components/ui/swipeable-card";
import { cn } from "@/lib/utils";
import type { VendorDebtItem } from "@/types/vendor";

interface VendorDebtsMobileListProps {
  items: VendorDebtItem[];
  busyId: string | null;
  onPay: (item: VendorDebtItem) => void;
}

export function VendorDebtsMobileList({ items, busyId, onPay }: VendorDebtsMobileListProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isBusy = busyId === item.vendor_id;

        const rightActions: SwipeAction[] = [
          {
            id: "pay",
            label: "Thanh toán",
            icon: <DollarSign className="mb-1 h-5 w-5" />,
            className: "bg-success text-white",
            onClick: () => {
              if (!isBusy && item.remaining > 0) onPay(item);
            },
          },
        ];

        return (
          <SwipeableCard key={item.vendor_id} rightActions={rightActions} actionWidth={72}>
            <article
              className={cn(
                "card-base space-y-3 p-4",
                isBusy && "pointer-events-none opacity-50"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 font-bold text-text-primary">{item.vendor_name}</div>
                  <div className="flex items-center gap-2 text-caption text-text-muted">
                    {item.vendor_phone && (
                      <>
                        <Phone className="h-3 w-3" />
                        <span>{item.vendor_phone}</span>
                      </>
                    )}
                    {item.service_type && <span>· {item.service_type}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-h3 font-bold tabular-nums text-error">{formatVnd(item.remaining)}</div>
                  <div className="text-caption text-text-muted">Còn nợ</div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <div className="text-caption text-text-muted">
                  {item.task_count} tasks · Đã trả: {formatVnd(item.total_paid)}
                </div>
                <div className="text-caption text-text-muted">
                  Task: {formatDate(item.last_task_date)}
                </div>
              </div>
            </article>
          </SwipeableCard>
        );
      })}

      {items.length === 0 && (
        <div className="card-base py-12 text-center text-text-muted">
          Không có vendor nào đang nợ tiền.
        </div>
      )}
    </div>
  );
}
