"use client";

import { useState } from "react";
import { Edit2, Printer, QrCode, Trash2 } from "lucide-react";
import { formatFinanceDate, formatVnd, financeMethodLabel, financeStatusLabel, financeStatusVariant, financeReceiptTypeLabel, financeReceiptTypeVariant } from "@/components/finance/finance-format";
import { SwipeableCard, type SwipeAction } from "@/components/ui/swipeable-card";
import { ReceiptQrPaymentModal } from "@/components/finance/receipts/receipt-qr-payment-modal";
import { ReceiptDetailModal } from "@/components/finance/receipts/receipt-detail-modal";
import type { ReceiptListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface ReceiptMobileSwipeCardProps {
  receipt: ReceiptListItem;
  bankInfo: BankInfo | null;
  deletingId: string | null;
  onEdit: (receipt: ReceiptListItem) => void;
  onDelete: (id: string) => void;
}

export function ReceiptMobileSwipeCard({
  receipt,
  bankInfo,
  deletingId,
  onEdit,
  onDelete,
}: ReceiptMobileSwipeCardProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isDeleting = deletingId === receipt.id;
  const isContractGenerated = receipt.source_table === "payments" || receipt.id.startsWith("payment:");

  // ── Swipe Actions configuration (Apple HIG) ── //
  
  // Left actions (swipe right to reveal)
  const leftActions: SwipeAction[] = [
    {
      id: "qr",
      label: "QR",
      icon: <QrCode className="w-5 h-5 mb-1" />,
      className: "bg-primary text-text-inverse",
      onClick: () => {
        if (receipt.receipt_amount > 0 && !isDeleting) {
          setIsQrOpen(true);
        }
      },
    },
    {
      id: "print",
      label: "In",
      icon: <Printer className="w-5 h-5 mb-1" />,
      className: "bg-info text-text-inverse",
      onClick: () => {
        window.open(`/finance/receipts/${receipt.id}/print`, "_blank");
      },
    },
  ];

  // Right actions (swipe left to reveal)
  const rightActions: SwipeAction[] = isContractGenerated ? [
    {
      id: "void",
      label: "Hủy",
      icon: <Trash2 className="w-5 h-5 mb-1" />,
      className: "bg-error text-text-inverse",
      onClick: () => {
        if (!isDeleting) onDelete(receipt.id);
      },
    },
  ] : [
    {
      id: "edit",
      label: "Sửa",
      icon: <Edit2 className="w-5 h-5 mb-1" />,
      className: "bg-warning text-text-inverse",
      onClick: () => {
        if (!isDeleting) onEdit(receipt);
      },
    },
    {
      id: "delete",
      label: "Xóa",
      icon: <Trash2 className="w-5 h-5 mb-1" />,
      className: "bg-error text-text-inverse",
      onClick: () => {
        if (!isDeleting) onDelete(receipt.id);
      },
    },
  ];

  return (
    <>
      <SwipeableCard
        leftActions={leftActions}
        rightActions={rightActions}
        actionWidth={72}
      >
        <article 
          // Cho phép tap vào thẻ để xem chi tiết
          onClick={() => setIsDetailOpen(true)}
          className={`card-base p-4 space-y-3 cursor-pointer active:bg-bg-hover transition-colors ${
            isDeleting ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-body-sm font-bold mb-1.5 truncate">
                {receipt.category_name || financeReceiptTypeLabel(receipt.receipt_type)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge badge-${financeReceiptTypeVariant(receipt.receipt_type)} shrink-0`}>
                  {financeReceiptTypeLabel(receipt.receipt_type)}
                </span>
                <span className="text-caption text-text-muted truncate">{formatFinanceDate(receipt.receipt_date)}</span>
              </div>
            </div>
            <span className={`badge badge-${financeStatusVariant(receipt.status)} shrink-0`}>
              {financeStatusLabel(receipt.status)}
            </span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="text-body-sm text-text-secondary min-w-0 flex-1">
              <div className="truncate">{receipt.contract_code || "Thu khác"}</div>
              <div className="truncate">{financeMethodLabel(receipt.payment_type)}</div>
            </div>
            <div className="text-amount tabular-nums text-right text-success shrink-0">{formatVnd(receipt.receipt_amount)}</div>
          </div>

          {receipt.notes && (
            <div className="text-caption text-text-muted truncate max-w-[280px] pt-1">
              {receipt.notes}
            </div>
          )}
        </article>
      </SwipeableCard>

      <ReceiptQrPaymentModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        receipt={receipt}
        bankInfo={bankInfo}
      />
      
      <ReceiptDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        receiptId={receipt.id}
      />
    </>
  );
}
