"use client";

import { Printer, Plus, Banknote, Trash2 } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { SwipeableCard, type SwipeAction } from "@/components/ui/swipeable-card";
import { cn } from "@/lib/utils";
import type { SalaryItem } from "@/types/finance-operations";

interface SalaryMobileSwipeCardProps {
  item: SalaryItem;
  busyId: string | null;
  onView: (item: SalaryItem) => void;
  onAdjust: (item: SalaryItem) => void;
  onPay: (item: SalaryItem) => void;
  onPrint: (item: SalaryItem) => void;
  onDelete: (item: SalaryItem) => void;
}

export function SalaryMobileSwipeCard({
  item,
  busyId,
  onView,
  onAdjust,
  onPay,
  onPrint,
  onDelete,
}: SalaryMobileSwipeCardProps) {
  const isBusy = busyId === item.id;

  const leftActions: SwipeAction[] = [
    {
      id: "pay",
      label: "Thanh toán",
      icon: <Banknote className="mb-1 h-5 w-5" />,
      className: "bg-success text-white",
      onClick: () => {
        if (!isBusy && item.remaining_amount > 0) onPay(item);
      },
    },
    {
      id: "print",
      label: "In phiếu",
      icon: <Printer className="mb-1 h-5 w-5" />,
      className: "bg-info text-white",
      onClick: () => {
        if (!isBusy) onPrint(item);
      },
    },
  ];

  const rightActions: SwipeAction[] = [
    {
      id: "delete",
      label: "Xóa",
      icon: <Trash2 className="mb-1 h-5 w-5" />,
      className: "bg-error text-white",
      onClick: () => {
        if (!isBusy) onDelete(item);
      },
    },
    {
      id: "adjust",
      label: "Sửa",
      icon: <Plus className="mb-1 h-5 w-5" />,
      className: "bg-interactive text-text-inverse",
      onClick: () => {
        if (!isBusy) onAdjust(item);
      },
    },
  ];

  return (
    <SwipeableCard
      leftActions={leftActions}
      rightActions={rightActions}
      actionWidth={72}
    >
      <article
        onClick={() => onView(item)}
        className={`card-base cursor-pointer space-y-3 p-4 transition-colors active:bg-bg-hover ${
          isBusy ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 truncate text-body-sm font-bold">
              {item.employee_name}
            </div>
            <div className="flex items-center gap-2">
              <span className="truncate text-caption text-text-muted">
                {item.employee_code || "N/A"} · {item.position}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 text-caption text-text-muted">
            CB: {formatVnd(item.base_salary)}
            {item.product_salary > 0 ? ` + SP: ${formatVnd(item.product_salary)}` : ""}
          </div>
          <div className="shrink-0 text-right text-h3 font-bold tabular-nums">
            {formatVnd(item.net_salary)}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <div className="text-caption font-medium text-success">
            Đã trả: {formatVnd(item.paid_amount)}
          </div>
          <div
            className={cn(
              "text-caption",
              item.remaining_amount > 0 ? "font-medium text-error" : "text-text-muted",
            )}
          >
            Còn lại: {formatVnd(item.remaining_amount)}
          </div>
        </div>
      </article>
    </SwipeableCard>
  );
}
