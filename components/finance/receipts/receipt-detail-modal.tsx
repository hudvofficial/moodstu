"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { getReceiptDetail } from "@/app/actions/finance-operations-queries";
import { getStudioInfo } from "@/app/actions/settings-queries";
import { formatVnd, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { readMoney } from "@/lib/finance-utils";
import type { ReceiptPrintData } from "@/components/finance/receipts/print-receipt-client";
import type { StudioInfo } from "@/types/settings";

interface ReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: string | null;
}

export function ReceiptDetailModal({ isOpen, onClose, receiptId }: ReceiptDetailModalProps) {
  const [data, setData] = useState<{ receipt: ReceiptPrintData; studio: StudioInfo | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset data if modal transitions to closed
    if (!isOpen) {
      const timer = setTimeout(() => {
        setData(null);
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }

    if (!receiptId) return;

    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [receiptRes, studioRes] = await Promise.all([
          getReceiptDetail(receiptId),
          getStudioInfo()
        ]);

        if (!isMounted) return;

        if (!receiptRes.success) {
          setError(typeof receiptRes.error === 'string' ? receiptRes.error : "Không tìm thấy phiếu thu. Vui lòng thử lại.");
          return;
        }
        if (!receiptRes.data) {
          setError("Dữ liệu phiếu thu trống. Vui lòng thử lại.");
          return;
        }

        setData({
          receipt: receiptRes.data,
          studio: studioRes.success ? studioRes.data : null
        });
      } catch (err: unknown) {
        if (isMounted) setError("Đã xảy ra lỗi hệ thống: " + (err as Error).message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen, receiptId]);

  let content;

  if (isLoading) {
    content = (
      <div className="flex flex-col items-center justify-center py-20 w-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-text-secondary text-sm">Đang tải phiếu thu...</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex flex-col items-center justify-center py-20 w-full min-h-[400px]">
        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4">
          <span className="text-error font-bold">!</span>
        </div>
        <p className="text-error text-center font-medium px-6">{error}</p>
      </div>
    );
  } else if (data) {
    const { receipt, studio } = data;
    const receiptDate = new Date(receipt.receipt_date);
    const formattedDate = `Ngày ${format(receiptDate, "dd")} tháng ${format(receiptDate, "MM")} năm ${format(receiptDate, "yyyy")}`;
    
    const statusColorMap: Record<string, string> = {
      danger: "border-error text-error",
      success: "border-success text-success",
      warning: "border-warning text-warning",
      default: "border-border text-text-secondary"
    };
    
    const statusVariant = financeStatusVariant(receipt.status);
    const statusColor = statusColorMap[statusVariant] || statusColorMap.default;
    
    const refCode = `REC-${receipt.id.slice(0, 8).toUpperCase()}`;
    const receiptCode = receipt.contract_code
      ? `PT-${receipt.contract_code}`
      : `PT-${format(receiptDate, "yyMM")}-${receipt.id.slice(0, 3).toUpperCase()}`;

    content = (
      <div className="relative overflow-hidden pt-8 sm:pt-10 pb-2 w-full min-h-[400px]">
        {/* Custom Close Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-0 right-0 w-8 h-8 p-0 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 z-50"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Stamp */}
        <div className="absolute top-10 right-0 z-0 pointer-events-none select-none">
          <div
            className={`border-2 px-4 py-1.5 rounded font-bold text-xs md:text-sm transform -rotate-12 opacity-70 ${statusColor}`}
          >
            {financeStatusLabel(receipt.status)}
          </div>
        </div>

        {/* Branding & Header */}
        <div className="relative z-10 flex justify-between items-start border-b border-border pb-4 mb-5 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-12 h-12 bg-surface-base border border-border rounded flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              <Image
                src={studio?.logo_url || "/logo.png"}
                alt={studio?.name || "Mood Studio"}
                fill
                className="object-contain p-1.5"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-text-primary leading-tight truncate">
                {studio?.name || "Mood Studio"}
              </h2>
              <div className="text-xs text-text-secondary mt-0.5">
                <p className="truncate">{studio?.address || "123 Nguyễn Văn Linh, Quận 7, TP.HCM"}</p>
                <p className="truncate">Hotline: {studio?.hotline || "0909 123 456"}</p>
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-right text-xs text-text-secondary min-w-fit">
            <p className="font-bold text-text-primary">Mẫu số 01-tt</p>
            <p className="italic">(TT số 200/2014/TT-BTC)</p>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-5 relative z-10">
          <h1 className="text-xl font-bold text-text-primary uppercase tracking-tight">
            Phiếu Thu
          </h1>
          <p className="text-text-secondary italic text-xs mt-0.5">
            {formattedDate}
          </p>
          <div className="mt-2 inline-block bg-surface px-3 py-1 rounded-full border border-border">
            <p className="text-xs text-text-secondary">
              Số phiếu: <span className="text-text-primary font-bold">{receiptCode}</span>
            </p>
          </div>
        </div>

        {/* Content Fields */}
        <div className="space-y-3 text-sm relative z-10 px-1">
          {/* Người nộp */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pb-2 border-b border-dashed border-border">
            <div className="text-text-secondary text-xs sm:w-28 shrink-0">Người nộp tiền:</div>
            <div className="font-bold text-text-primary">{receipt.customer_name || "Khách hàng vãng lai"}</div>
          </div>

          {/* Nội dung */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pb-2 border-b border-dashed border-border">
            <div className="text-text-secondary text-xs sm:w-28 shrink-0">Nội dung thu:</div>
            <div className="text-text-primary">
              {receipt.category_name || "Thu khác"}
              {receipt.contract_code && (
                <span className="ml-2 text-text-secondary text-xs italic">
                  (HĐ: <strong>{receipt.contract_code}</strong>)
                </span>
              )}
            </div>
          </div>

          {/* Số tiền */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 pb-2 border-b border-dashed border-border bg-success/5 p-2 rounded -mx-2 px-3">
            <div className="text-text-secondary text-xs sm:w-24 shrink-0 font-medium">Số tiền:</div>
            <div>
              <div className="text-lg font-bold text-success leading-none">
                {formatVnd(receipt.receipt_amount)}
              </div>
              <div className="text-text-secondary italic text-xs mt-1">
                (Bằng chữ: <span className="font-medium text-text-primary">{readMoney(receipt.receipt_amount)}</span>)
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          {receipt.notes && (
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pb-2 border-b border-dashed border-border">
              <div className="text-text-secondary text-xs sm:w-28 shrink-0">Ghi chú:</div>
              <div className="text-text-secondary italic">{receipt.notes}</div>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center pt-4">
          <div className="flex flex-col items-center">
            <p className="font-bold text-text-primary text-xs mb-0.5">Người nộp tiền</p>
            <p className="text-xs text-text-secondary italic mb-2">(Ký, họ tên)</p>
            <div className="h-10 w-full flex items-center justify-center opacity-80">
              <span className="font-serif italic text-sm transform -rotate-6">{receipt.customer_name || "K/H"}</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="font-bold text-text-primary text-xs mb-0.5">Kế toán trưởng</p>
            <p className="text-xs text-text-secondary italic mb-2">(Ký, họ tên)</p>
            <div className="h-10 w-full flex items-center justify-center text-text-muted">
              <span className="text-xs italic">Chưa ký</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="font-bold text-text-primary text-xs mb-0.5">Thủ quỹ</p>
            <p className="text-xs text-text-secondary italic mb-2">(Ký, đóng dấu)</p>
            <div className="h-10 w-full flex items-center justify-center">
              <div className="border-2 border-success text-success px-2 py-0.5 rounded font-bold text-xs transform -rotate-12">
                ĐÃ THU
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-8 text-center border-t border-dashed border-border pt-3 opacity-50 flex flex-col gap-1">
          <p className="text-xs text-text-secondary font-mono">
            ID: {receipt.id.split("-")[0]} • Ref: {refCode} • Created: {receipt.created_at ? format(new Date(receipt.created_at), "dd/MM/yyyy HH:mm") : "N/A"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
    >
      {content}
    </UnifiedModal>
  );
}
