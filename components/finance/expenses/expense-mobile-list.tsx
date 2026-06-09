"use client";

import type { ExpenseListItem } from "@/types/finance-operations";
import { ExpenseMobileSwipeCard } from "./expense-mobile-swipe-card";

interface ExpenseMobileListProps {
  items: ExpenseListItem[];
  busyId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ExpenseListItem) => void;
  onView: (id: string) => void;
  onPrint: (id: string) => void;
}

export function ExpenseMobileList({
  items,
  busyId,
  onApprove,
  onDelete,
  onEdit,
  onView,
  onPrint,
}: ExpenseMobileListProps) {
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="card-base p-5 text-center text-text-muted">
          Chưa có phiếu chi trong kỳ này.
        </div>
      ) : (
        items.map((item) => (
          <ExpenseMobileSwipeCard
            key={item.id}
            item={item}
            busyId={busyId}
            onApprove={onApprove}
            onDelete={onDelete}
            onEdit={onEdit}
            onView={onView}
            onPrint={onPrint}
          />
        ))
      )}
    </div>
  );
}
