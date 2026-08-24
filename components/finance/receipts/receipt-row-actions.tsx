"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit2, Eye, Printer, QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptQrPaymentModal } from "@/components/finance/receipts/receipt-qr-payment-modal";
import { ReceiptDetailModal } from "@/components/finance/receipts/receipt-detail-modal";
import type { ReceiptListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface ReceiptRowActionsProps {
  receipt: ReceiptListItem;
  bankInfo: BankInfo | null;
  deletingId: string | null;
  onEdit: (receipt: ReceiptListItem) => void;
  onDelete: (id: string) => void;
}

export function ReceiptRowActions({
  receipt,
  bankInfo,
  deletingId,
  onEdit,
  onDelete,
}: ReceiptRowActionsProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isDeleting = deletingId === receipt.id;
  const isContractGenerated = receipt.source_table === "payments" || receipt.id.startsWith("payment:");
  const isSaleReceipt = receipt.receipt_type === "sale_receipt";
  const isEditLocked = isContractGenerated || isSaleReceipt;

  const strokeWg = 1.75;
  const linkClassName = "btn-icon text-text-secondary";

  // Override cứng bằng inline CSS để chống lại bất kỳ rules nào từ global CSS
  const btnStyle = { padding: 0 };
  const iconStyle = { width: 20, height: 20 };

  return (
    <>
      <div className="flex flex-row items-center justify-end gap-1.5 min-w-max">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsDetailOpen(true)}
          className={linkClassName}
          style={btnStyle}
          aria-label="Xem phieu thu"
          title="Xem chi tiết"
        >
          <Eye style={iconStyle} strokeWidth={strokeWg} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsQrOpen(true)}
          disabled={receipt.receipt_amount <= 0 || isDeleting}
          className={linkClassName}
          style={btnStyle}
          aria-label="QR thanh toan"
          title="QR Thanh toán"
        >
          <QrCode style={iconStyle} strokeWidth={strokeWg} />
        </Button>
        <Link
          href={`/finance/receipts/${receipt.id}/print`}
          target="_blank"
          rel="noreferrer"
          className={linkClassName}
          aria-label="In phieu thu"
          title="In phiếu"
        >
          <Printer style={iconStyle} strokeWidth={strokeWg} />
        </Link>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onEdit(receipt)}
          disabled={isDeleting || isEditLocked}
          className={linkClassName}
          style={btnStyle}
          aria-label="Sua phieu thu"
          title={isSaleReceipt ? "Phiếu bán vật tư — sửa từ Vật tư" : "Chỉnh sửa"}
        >
          <Edit2 style={iconStyle} strokeWidth={strokeWg} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onDelete(receipt.id)}
          disabled={isDeleting}
          className={`btn-icon ${isDeleting ? "animate-pulse text-text-muted" : "text-error hover:text-error hover:bg-error/10"}`}
          style={btnStyle}
          aria-label={isContractGenerated ? "Huy phieu thu hop dong" : "Xoa phieu thu"}
          title={isContractGenerated ? "Hủy phiếu" : "Xóa"}
        >
          <Trash2 style={iconStyle} strokeWidth={strokeWg} />
        </Button>
      </div>

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
