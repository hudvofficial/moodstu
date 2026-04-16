"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, QrCode, Settings, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatVnd } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { DebtListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface DebtQrPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    debt: DebtListItem;
    bankInfo: BankInfo | null;
}

function buildDebtCode(debt: DebtListItem) {
    return `CN-${debt.id.slice(0, 8).toUpperCase()}`;
}

function buildTransferMemo(debt: DebtListItem) {
    const isPayable = debt.type === "payable" || debt.type === "Phải trả";
    // Nếu là công nợ phải trả (mình nợ họ), QR này dùng để mình chuyển khoản cho họ.
    // Nhưng QR VietQR được tạo từ STK MẶC ĐỊNH CỦA STUDIO, tức là QR NÀY DÙNG ĐỂ THU TIỀN (Phải thu khách).
    // Vậy với khoản phải trả, thì QR này vô tác dụng, hoặc chỉ để ghi log nội bộ. Dù sao ta vẫn cấp mã.
    const prefix = isPayable ? "Thanh toan" : "Thanh toan no";
    const memo = `${prefix} ${debt.entity_name} ${buildDebtCode(debt)}`;
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

export function DebtQrPaymentModal({
    isOpen,
    onClose,
    debt,
    bankInfo,
}: DebtQrPaymentModalProps) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const memo = useMemo(() => buildTransferMemo(debt), [debt]);
    const qrUrl = bankInfo?.qr_code_url?.trim() || (bankInfo ? buildVietQrUrl(bankInfo, debt.remaining, memo) : "");
    const hasBankDetails = Boolean(bankInfo?.account_number && bankInfo?.account_name);
    const hasPaymentConfig = Boolean(qrUrl || hasBankDetails);
    const isPayable = debt.type === "payable" || debt.type === "Phải trả";

    const paymentText = [
        bankInfo?.bank_name ? `Ngan hang: ${bankInfo.bank_name}` : null,
        bankInfo?.account_number ? `STK: ${bankInfo.account_number}` : null,
        bankInfo?.account_name ? `Chu TK: ${bankInfo.account_name}` : null,
        `So tien: ${formatVnd(debt.remaining)}`,
        `Noi dung: ${memo}`,
    ].filter(Boolean).join("\n");

    const copyPaymentInfo = async () => {
        if (!paymentText) return;
        try {
            await navigator.clipboard.writeText(paymentText);
            setCopied(true);
            toast.success("Đã copy thông tin thanh toán.");
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Không thể copy thông tin.");
        }
    };

    const sharePaymentInfo = async () => {
        if (!paymentText) return;
        try {
            if (navigator.share) {
                await navigator.share({ title: buildDebtCode(debt), text: paymentText });
                return;
            }
            await navigator.clipboard.writeText(paymentText);
            toast.success("Đã copy thông tin thanh toán.");
        } catch { }
    };

    const downloadQr = () => {
        if (!qrUrl) return;
        const link = document.createElement("a");
        link.href = qrUrl;
        link.download = `${buildDebtCode(debt)}.png`;
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
            title="Mã QR & Thanh toán"
            description={isPayable ? "Thông tin thanh toán để bạn trả nợ cho đối tác. (Trao đổi trực tiếp nếu họ có STK riêng)" : "Gửi thông tin này cho khách hàng để họ quét mã chuyển khoản trả nợ."}
            size="sm"
            footer={hasPaymentConfig ? (
                <div className="form-actions">
                    <Button type="button" variant="secondary" onClick={sharePaymentInfo} className="gap-2">
                        <Share2 className="w-4 h-4" />
                        Chia sẻ
                    </Button>
                    <Button type="button" onClick={downloadQr} disabled={!qrUrl} className="gap-2">
                        <Download className="w-4 h-4" />
                        Tải QR
                    </Button>
                </div>
            ) : undefined}
        >
            {hasPaymentConfig ? (
                <div className="space-y-4">
                    <div className="text-center">
                        <p className="text-caption text-text-muted">Đối tượng thanh toán</p>
                        <p className="text-label text-text-primary">{debt.entity_name}</p>
                    </div>

                    <div className="card-base p-4 flex justify-center">
                        {qrUrl ? (
                            <img src={qrUrl} alt="QR thanh toán" className="h-56 w-56 object-contain" />
                        ) : (
                            <div className="h-56 w-56 flex flex-col items-center justify-center gap-2 text-text-muted">
                                <QrCode className="w-10 h-10" />
                                <span className="text-caption text-center">Chưa có mã hình QR, dùng số tài khoản bên dưới.</span>
                            </div>
                        )}
                    </div>

                    <div className="card-base p-3 text-center">
                        <p className="text-caption text-text-muted">Số tiền cần thanh toán</p>
                        <p className={`text-amount tabular-nums ${isPayable ? "text-error" : "text-success"}`}>{formatVnd(debt.remaining)}</p>
                    </div>

                    <div className="card-base p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-caption text-text-muted">Tài khoản nhận (Studio)</p>
                                <p className="text-label text-text-primary truncate">
                                    {bankInfo?.bank_name || "Ngân hàng"} - {bankInfo?.account_number || "Chưa có STK"}
                                </p>
                                <p className="text-caption text-text-secondary truncate">{bankInfo?.account_name || "Chưa có chủ tài khoản"}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={copyPaymentInfo} className="h-8 w-8 p-0 shrink-0">
                                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="card-base p-3">
                        <p className="text-caption text-text-muted">Nội dung chuyển khoản chuẩn</p>
                        <p className="text-body-sm font-semibold text-text-primary">{memo}</p>
                    </div>
                </div>
            ) : (
                <div className="py-6 text-center space-y-4">
                    <div className="icon-box bg-surface-elevated mx-auto">
                        <QrCode className="w-7 h-7 text-text-muted" />
                    </div>
                    <div>
                        <p className="text-label text-text-primary">Chưa thiết lập QR thanh toán</p>
                        <p className="text-body-sm text-text-secondary mt-1">
                            Thêm thông tin Ngân hàng của Studio trong phần cài đặt để tự động tạo mã quét.
                        </p>
                    </div>
                    <Button type="button" variant="secondary" onClick={openSettings} className="gap-2">
                        <Settings className="w-4 h-4" />
                        Mở Cài đặt
                    </Button>
                </div>
            )}
        </UnifiedModal>
    );
}
