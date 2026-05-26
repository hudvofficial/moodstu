"use client";

import { useState } from "react";
import { CheckCircle, MessageCircle, QrCode, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DebtQrPaymentModal } from "@/components/finance/debts/debt-qr-payment-modal";
import { formatVnd, formatFinanceDate } from "@/components/finance/finance-format";
import type { DebtListItem } from "@/types/finance-operations";

import type { BankInfo } from "@/types/settings";

interface DebtRowActionsProps {
    debt: DebtListItem;
    bankInfo: BankInfo | null;
    busyId: string | null;
    onMarkPaid: (debt: DebtListItem) => void;
    onViewHistory: (debt: DebtListItem) => void;
    onDelete: (debt: DebtListItem) => void;
}

export function DebtRowActions({
    debt,
    bankInfo,
    busyId,
    onMarkPaid,
    onViewHistory,
    onDelete,
}: DebtRowActionsProps) {
    const [isQrOpen, setIsQrOpen] = useState(false);
    const isDeleting = busyId === debt.id;

    const strokeWg = 1.75;
    const linkClassName = "btn-icon";
    const btnStyle = { padding: 0 };
    const iconStyle = { width: 20, height: 20 };

    const isClosed = debt.status === "closed" || debt.status === "da_thanh_toan";

    const copyZaloReminder = async () => {
        const isPayable = debt.type === "payable" || debt.type === "Phải trả";
        const amountStr = formatVnd(debt.remaining);
        const dateStr = formatFinanceDate(debt.due_date);

        let text = "";
        if (isPayable) {
            text = `Xin chào ${debt.entity_name},\nMood Studio thông báo: Chúng tôi đã ghi nhận khoản cần thanh toán ${amountStr} (Hạn: ${dateStr}). Xin vui lòng cung cấp STK để chúng tôi hoàn tất thanh toán. Xin cảm ơn.`;
        } else {
            text = `Xin chào ${debt.entity_name},\nMood Studio xin thông báo: Hiện tại khoản công nợ của bạn đang còn ${amountStr} (Hạn: ${dateStr}). Bạn vui lòng kiểm tra và hỗ trợ quét mã chuyển khoản đối soát giúp Studio nha. Xin cảm ơn.`;
        }

        try {
            await navigator.clipboard.writeText(text);
            toast.success("Đã copy tin nhắn nhắc nợ Zalo.");
        } catch {
            toast.error("Lỗi khi copy nội dung.");
        }
    };

    return (
        <>
            <div className="flex flex-row items-center justify-end gap-1.5 min-w-max">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsQrOpen(true)}
                    disabled={isClosed || isDeleting}
                    className={`${linkClassName} text-info hover:bg-info/10`}
                    style={btnStyle}
                    aria-label="Mã QR Thanh toán"
                    title="Mã QR"
                >
                    <QrCode style={iconStyle} strokeWidth={strokeWg} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onViewHistory(debt)}
                    disabled={isDeleting}
                    className={`${linkClassName} text-brand hover:bg-brand/10`}
                    style={btnStyle}
                    aria-label="Lịch sử thanh toán"
                    title="Lịch sử giao dịch"
                >
                    <History style={iconStyle} strokeWidth={strokeWg} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={copyZaloReminder}
                    disabled={isClosed || isDeleting}
                    className={`${linkClassName} text-warning hover:bg-warning/10`}
                    style={btnStyle}
                    aria-label="Nhắc nợ Zalo"
                    title="Copy Zalo Remind"
                >
                    <MessageCircle style={iconStyle} strokeWidth={strokeWg} />
                </Button>
                {!isClosed && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onMarkPaid(debt)}
                        disabled={isDeleting}
                        className={`${linkClassName} text-success hover:bg-success/10`}
                        style={btnStyle}
                        title="Gạch nợ (Thanh toán)"
                    >
                        <CheckCircle style={iconStyle} strokeWidth={strokeWg} />
                    </Button>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onDelete(debt)}
                    disabled={isDeleting}
                    className={`btn-icon ${isDeleting ? "animate-pulse text-text-muted" : "text-error hover:text-error hover:bg-error/10"}`}
                    style={btnStyle}
                    aria-label="Xóa công nợ"
                    title="Xóa"
                >
                    <Trash2 style={iconStyle} strokeWidth={strokeWg} />
                </Button>
            </div>

            <DebtQrPaymentModal
                isOpen={isQrOpen}
                onClose={() => setIsQrOpen(false)}
                debt={debt}
                bankInfo={bankInfo}
            />
        </>
    );
}
