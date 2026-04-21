"use client";

import { SalaryMobileSwipeCard } from "@/components/finance/salaries/salary-mobile-swipe-card";
import type { SalaryItem } from "@/types/finance-operations";

interface SalaryMobileListProps {
  items: SalaryItem[];
  busyId: string | null;
  onView: (item: SalaryItem) => void;
  onAdjust: (item: SalaryItem) => void;
  onPay: (item: SalaryItem) => void;
  onPrint: (item: SalaryItem) => void;
  onDelete: (item: SalaryItem) => void;
}

export function SalaryMobileList({
  items,
  busyId,
  onView,
  onAdjust,
  onPay,
  onPrint,
  onDelete,
}: SalaryMobileListProps) {
  return (
    <div className="space-y-3 pb-32 lg:hidden">
      {items.length === 0 ? (
        <div className="card-base p-5 text-center text-text-muted">
          Chưa có dữ liệu lương tháng này.
        </div>
      ) : (
        items.map((item) => (
          <SalaryMobileSwipeCard
            key={item.id}
            item={item}
            busyId={busyId}
            onView={onView}
            onAdjust={onAdjust}
            onPay={onPay}
            onPrint={onPrint}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}
