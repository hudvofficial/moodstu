"use client";

import { ReceiptMobileSwipeCard } from "@/components/finance/receipts/receipt-mobile-swipe-card";
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
    <div className="space-y-3 lg:hidden pb-32">
      {items.length === 0 ? (
        <div className="card-base p-5 text-center text-text-muted">
          Chưa có phiếu thu trong kỳ này.
        </div>
      ) : (
        items.map((item) => (
          <ReceiptMobileSwipeCard
            key={item.id}
            receipt={item}
            bankInfo={bankInfo}
            deletingId={deletingId}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}
