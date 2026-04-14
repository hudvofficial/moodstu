"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, QrCode, Settings, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatVnd } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { ReceiptListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface ReceiptQrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptListItem;
  bankInfo: BankInfo | null;
}

function buildReceiptCode(receipt: ReceiptListItem) {
  return receipt.contract_code
    ? `PT-${receipt.contract_code}`
    : `PT-${receipt.id.slice(0, 8).toUpperCase()}`;
}

function buildTransferMemo(receipt: ReceiptListItem) {
  const memo = `Thanh toan ${buildReceiptCode(receipt)}`;
  return memo.replace(/\s+/g, " ").trim().slice(0, 80);
}

function buildVietQrUrl(bankInfo: BankInfo, amount: number, memo: string) {
  const bankBin = bankInfo.bank_bin?.trim();
  const accountNumber = bankInfo.account_number?.replace(/\s+/g, "");
  const accountName = bankInfo.account_name?.trim();
  if (!bankBin || !accountNumber || !accountName) return "";

  const params = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amount))),
    addInfo: memo,
    accountName,
  });
  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?${params.toString()}`;
}

export function ReceiptQrPaymentModal({
  isOpen,
  onClose,
  receipt,
  bankInfo,
}: ReceiptQrPaymentModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const memo = useMemo(() => buildTransferMemo(receipt), [receipt]);
  const qrUrl = bankInfo?.qr_code_url?.trim() || (bankInfo ? buildVietQrUrl(bankInfo, receipt.receipt_amount, memo) : "");
  const hasBankDetails = Boolean(bankInfo?.account_number && bankInfo?.account_name);
  const hasPaymentConfig = Boolean(qrUrl || hasBankDetails);

  const paymentText = [
    bankInfo?.bank_name ? `Ngan hang: ${bankInfo.bank_name}` : null,
    bankInfo?.account_number ? `STK: ${bankInfo.account_number}` : null,
    bankInfo?.account_name ? `Chu TK: ${bankInfo.account_name}` : null,
    `So tien: ${formatVnd(receipt.receipt_amount)}`,
    `Noi dung: ${memo}`,
  ].filter(Boolean).join("\n");

  const copyPaymentInfo = async () => {
    if (!paymentText) return;
    try {
      await navigator.clipboard.writeText(paymentText);
      setCopied(true);
      toast.success("Da copy thong tin thanh toan.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Khong the copy thong tin thanh toan.");
    }
  };

  const sharePaymentInfo = async () => {
    if (!paymentText) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: buildReceiptCode(receipt), text: paymentText });
        return;
      }
      await navigator.clipboard.writeText(paymentText);
      toast.success("Da copy thong tin thanh toan.");
    } catch {
      // User cancelled native share.
    }
  };

  const downloadQr = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `${buildReceiptCode(receipt)}.png`;
    link.rel = "noreferrer";
    link.click();
  };

  const openSettings = () => {
    onClose();
    router.push("/settings");
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="QR thanh toan"
      description="Dung cho chuyen khoan, khong tu dong ghi nhan da thu."
      size="sm"
      footer={hasPaymentConfig ? (
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={sharePaymentInfo} className="gap-2">
            <Share2 className="w-4 h-4" />
            Chia se
          </Button>
          <Button type="button" onClick={downloadQr} disabled={!qrUrl} className="gap-2">
            <Download className="w-4 h-4" />
            Tai QR
          </Button>
        </div>
      ) : undefined}
    >
      {hasPaymentConfig ? (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-caption text-text-muted">Khach hang</p>
            <p className="text-label text-text-primary">{receipt.customer_name || "Khach le"}</p>
          </div>

          <div className="card-base p-4 flex justify-center">
            {qrUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qrUrl} alt="QR thanh toan" className="h-56 w-56 object-contain" />
            ) : (
              <div className="h-56 w-56 flex flex-col items-center justify-center gap-2 text-text-muted">
                <QrCode className="w-10 h-10" />
                <span className="text-caption text-center">Chua co QR, dung thong tin STK ben duoi.</span>
              </div>
            )}
          </div>

          <div className="card-base p-3 text-center">
            <p className="text-caption text-text-muted">So tien</p>
            <p className="text-amount text-success tabular-nums">{formatVnd(receipt.receipt_amount)}</p>
          </div>

          <div className="card-base p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption text-text-muted">Tai khoan nhan</p>
                <p className="text-label text-text-primary truncate">
                  {bankInfo?.bank_name || "Ngan hang"} - {bankInfo?.account_number || "Chua co STK"}
                </p>
                <p className="text-caption text-text-secondary truncate">{bankInfo?.account_name || "Chua co chu tai khoan"}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={copyPaymentInfo} className="h-8 w-8 p-0">
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="card-base p-3">
            <p className="text-caption text-text-muted">Noi dung chuyen khoan</p>
            <p className="text-body-sm font-semibold text-text-primary">{memo}</p>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center space-y-4">
          <div className="icon-box bg-surface-elevated mx-auto">
            <QrCode className="w-7 h-7 text-text-muted" />
          </div>
          <div>
            <p className="text-label text-text-primary">Chua cau hinh QR thanh toan</p>
            <p className="text-body-sm text-text-secondary mt-1">
              Them QR tinh hoac ma BIN, so tai khoan va chu tai khoan trong cai dat studio.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={openSettings} className="gap-2">
            <Settings className="w-4 h-4" />
            Mo cai dat
          </Button>
        </div>
      )}
    </UnifiedModal>
  );
}
