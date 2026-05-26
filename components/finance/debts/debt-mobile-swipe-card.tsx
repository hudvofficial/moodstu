"use client";

import { useState } from "react";
import { CheckCircle, QrCode, MessageCircle, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { SwipeableCard, type SwipeAction } from "@/components/ui/swipeable-card";
import { Badge } from "@/components/ui/badge";
import { getDebtBadge } from "@/components/finance/debts/debt-desktop-table";
import { DebtQrPaymentModal } from "@/components/finance/debts/debt-qr-payment-modal";
import type { DebtListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface DebtMobileSwipeCardProps {
    receipt: DebtListItem;
    bankInfo: BankInfo | null;
    busyId: string | null;
    onMarkPaid: (item: DebtListItem) => void;
    onViewHistory: (item: DebtListItem) => void;
    onDelete: (item: DebtListItem) => void;
}

export function DebtMobileSwipeCard({
    receipt: item,
    bankInfo,
    busyId,
    onMarkPaid,
    onViewHistory,
    onDelete,
}: DebtMobileSwipeCardProps) {
    const isBusy = busyId === item.id;
    const badge = getDebtBadge(item);
    const [isQrOpen, setIsQrOpen] = useState(false);

    const isClosed = item.status === "closed" || item.status === "da_thanh_toan";

    const copyZaloReminder = async () => {
        const isPayable = item.type === "payable" || item.type === "Phải trả";
        const amountStr = formatVnd(item.remaining);
        const dateStr = formatFinanceDate(item.due_date);

        let text = "";
        if (isPayable) {
            text = `Xin chào ${item.entity_name},\nMood Studio thông báo: Chúng tôi đã ghi nhận khoản cần thanh toán ${amountStr} (Hạn: ${dateStr}). Xin vui lòng cung cấp STK để chúng tôi hoàn tất thanh toán. Xin cảm ơn.`;
        } else {
            text = `Xin chào ${item.entity_name},\nMood Studio xin thông báo: Hiện tại khoản công nợ của bạn đang còn ${amountStr} (Hạn: ${dateStr}). Bạn vui lòng kiểm tra và hỗ trợ quét mã chuyển khoản đối soát giúp Studio nha. Xin cảm ơn.`;
        }

        try {
            await navigator.clipboard.writeText(text);
            toast.success("Đã copy tin nhắn nhắc nợ Zalo.");
        } catch {
            toast.error("Lỗi khi copy nội dung.");
        }
    };

    // ── Swipe Actions configuration (Apple HIG) ── //

    // Left actions (swipe right to reveal)
    const leftActions: SwipeAction[] = [
        ...(!isClosed ? [{
            id: "pay",
            label: "Gạch nợ",
            icon: <CheckCircle className="w-5 h-5 mb-1" />,
            className: "bg-success text-text-inverse",
            onClick: () => {
                if (!isBusy) onMarkPaid(item);
            },
        }] : []),
        {
            id: "remind",
            label: "Nhắc nợ",
            icon: <MessageCircle className="w-5 h-5 mb-1" />,
            className: "bg-orange-500 text-text-inverse",
            onClick: copyZaloReminder,
        },
        {
            id: "qr_code",
            label: "Mã QR",
            icon: <QrCode className="w-5 h-5 mb-1" />,
            className: "bg-blue-500 text-text-inverse",
            onClick: () => setIsQrOpen(true),
        },
        {
            id: "history",
            label: "Lịch sử",
            icon: <History className="w-5 h-5 mb-1" />,
            className: "bg-brand text-text-inverse",
            onClick: () => onViewHistory(item),
        }
    ];

    // Right actions (swipe left to reveal)
    const rightActions: SwipeAction[] = [
        {
            id: "delete",
            label: "Xóa",
            icon: <Trash2 className="w-5 h-5 mb-1" />,
            className: "bg-error text-text-inverse",
            onClick: () => {
                if (!isBusy) onDelete(item);
            },
        },
    ];

    return (
        <>
            <SwipeableCard
                leftActions={!isClosed ? leftActions : leftActions.filter(a => a.id !== "pay")}
                rightActions={rightActions}
                actionWidth={80}
            >
                <article
                    className={`card-base p-4 space-y-3 ${isBusy ? "opacity-50 pointer-events-none" : ""
                        } ${item.days_overdue > 0 && !isClosed ? "bg-error/5 border-error/20" : ""}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="text-body-sm font-bold mb-1.5 truncate">
                                {item.entity_name}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="tag-badge shrink-0">{item.entity_type} {item.type}</span>
                                {item.platform && <span className="tag-badge shrink-0 text-tiny uppercase text-text-muted">{item.platform.replace("_", " ")}</span>}
                                <span className="text-caption text-text-muted truncate">Hạn: {formatFinanceDate(item.due_date)}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <Badge variant={badge.variant} className="shrink-0">
                                {badge.label}
                            </Badge>
                            {item.installment_total ? (
                                <span className="text-tiny font-medium text-text-muted bg-bg-hover px-1.5 py-0.5 rounded-sm border border-border/50 shrink-0">
                                    Kỳ {(item.installment_paid || 0)}/{item.installment_total}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                        <div className="text-caption text-text-muted min-w-0 flex-1">
                            Gốc {formatVnd(item.amount)}
                        </div>
                        <div className="text-amount tabular-nums text-right font-bold text-body shrink-0">
                            {formatVnd(item.remaining)}
                        </div>
                    </div>

                    {item.notes && (
                        <div className="text-caption text-text-muted truncate max-w-[280px] pt-1">
                            {item.notes}
                        </div>
                    )}
                </article>
            </SwipeableCard>

            <DebtQrPaymentModal
                isOpen={isQrOpen}
                onClose={() => setIsQrOpen(false)}
                debt={item}
                bankInfo={bankInfo}
            />
        </>
    );
}
