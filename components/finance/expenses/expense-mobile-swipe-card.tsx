"use client";

import { Check, Trash2, Eye, Printer, Edit3 } from "lucide-react";
import { formatFinanceDate, formatVnd, financeMethodLabel, financeStatusVariant, financeStatusLabel } from "@/components/finance/finance-format";
import { SwipeableCard, type SwipeAction } from "@/components/ui/swipeable-card";
import type { ExpenseListItem } from "@/types/finance-operations";

interface ExpenseMobileSwipeCardProps {
  item: ExpenseListItem;
  busyId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ExpenseListItem) => void;
  onView: (id: string) => void;
  onPrint: (id: string) => void;
}

export function ExpenseMobileSwipeCard({
  item,
  busyId,
  onApprove,
  onDelete,
  onEdit,
  onView,
  onPrint,
}: ExpenseMobileSwipeCardProps) {
  const isBusy = busyId === item.id;

  // Left actions (swipe right to reveal)
  const leftActions: SwipeAction[] = [
    {
      id: "view",
      label: "Xem",
      icon: <Eye className="w-5 h-5 mb-1" />,
      className: "bg-primary text-text-inverse",
      onClick: () => onView(item.id),
    },
    {
      id: "print",
      label: "In",
      icon: <Printer className="w-5 h-5 mb-1" />,
      className: "bg-info text-text-inverse",
      onClick: () => onPrint(item.id),
    },
  ];

  // Right actions (swipe left to reveal)
  const rightActions: SwipeAction[] = [];

  if (!item.approved_by) {
    rightActions.push({
      id: "edit",
      label: "Sửa",
      icon: <Edit3 className="w-5 h-5 mb-1" />,
      className: "bg-warning text-text-inverse",
      onClick: () => {
        if (!isBusy) onEdit(item);
      },
    });
    rightActions.push({
      id: "approve",
      label: "Duyệt",
      icon: <Check className="w-5 h-5 mb-1" />,
      className: "bg-success text-text-inverse",
      onClick: () => {
        if (!isBusy) onApprove(item.id);
      },
    });
    rightActions.push({
      id: "delete",
      label: "Xóa",
      icon: <Trash2 className="w-5 h-5 mb-1" />,
      className: "bg-error text-text-inverse",
      onClick: () => {
        if (!isBusy) onDelete(item.id);
      },
    });
  }

  return (
    <SwipeableCard
      leftActions={leftActions}
      rightActions={rightActions}
      actionWidth={72}
    >
      <article
        onClick={() => onView(item.id)}
        className={`card-base p-4 space-y-3 cursor-pointer active:bg-bg-hover transition-colors ${isBusy ? "opacity-50 pointer-events-none" : ""
          }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-body-sm font-bold mb-1.5 truncate">
              {item.category_name || "Chưa phân loại"}
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-error shrink-0">
                Phiếu Chi
              </span>
              <span className="text-caption text-text-muted truncate">
                {formatFinanceDate(item.expense_date)}
              </span>
            </div>
          </div>
          <span className={`badge badge-${financeStatusVariant(item.approved_by ? "approved" : "pending")} shrink-0`}>
            {financeStatusLabel(item.approved_by ? "approved" : "pending")}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="text-body-sm text-text-secondary min-w-0 flex-1">
            <div className="truncate">{item.recipient || "Không rõ người nhận"}</div>
            <div className="truncate">{financeMethodLabel(item.payment_method)}</div>
          </div>
          <div className="text-amount tabular-nums text-right text-error shrink-0">
            {formatVnd(item.amount)}
          </div>
        </div>

        {item.description && (
          <div className="text-caption text-text-muted truncate max-w-[280px] pt-1">
            {item.description}
          </div>
        )}
      </article>
    </SwipeableCard>
  );
}
