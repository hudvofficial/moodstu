"use client";

import { Eye, Plus, Banknote, Trash2 } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { SwipeableCard, type SwipeAction } from "@/components/ui/swipeable-card";
import { cn } from "@/lib/utils";
import type { SalaryItem } from "@/types/finance-operations";

interface SalaryMobileSwipeCardProps {
    item: SalaryItem;
    busyId: string | null;
    onView: (item: SalaryItem) => void;
    onAdjust: (item: SalaryItem) => void;
    onPay: (item: SalaryItem) => void;
    onDelete: (item: SalaryItem) => void;
}

export function SalaryMobileSwipeCard({
    item,
    busyId,
    onView,
    onAdjust,
    onPay,
    onDelete,
}: SalaryMobileSwipeCardProps) {
    const isBusy = busyId === item.id; // Using exact item id logic if needed later

    // Left action: View User Salary & Pay
    const leftActions: SwipeAction[] = [
        {
            id: "pay",
            label: "Thanh toán",
            icon: <Banknote className="w-5 h-5 mb-1" />,
            className: "bg-success text-white",
            onClick: () => {
                if (!isBusy && item.remaining_amount > 0) onPay(item);
            },
        },
        {
            id: "view",
            label: "Chi tiết",
            icon: <Eye className="w-5 h-5 mb-1" />,
            className: "bg-surface-elevated text-text-primary",
            onClick: () => onView(item),
        }
    ];

    // Right action: Adjust Salary & Delete
    const rightActions: SwipeAction[] = [
        {
            id: "delete",
            label: "Xóa",
            icon: <Trash2 className="w-5 h-5 mb-1" />,
            className: "bg-error text-white",
            onClick: () => {
                if (!isBusy) onDelete(item);
            },
        },
        {
            id: "adjust",
            label: "Sửa",
            icon: <Plus className="w-5 h-5 mb-1" />,
            className: "bg-interactive text-text-inverse",
            onClick: () => {
                if (!isBusy) onAdjust(item);
            },
        },
    ];

    return (
        <SwipeableCard
            leftActions={leftActions}
            rightActions={rightActions}
            actionWidth={72}
        >
            <article className={`card-base p-4 space-y-3 ${isBusy ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="text-body-sm font-bold mb-1.5 truncate">
                            {item.employee_name}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-caption text-text-muted truncate">
                                {item.employee_code || "N/A"} · {item.position}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-end justify-between gap-3">
                    <div className="text-caption text-text-muted min-w-0 flex-1">
                        CB: {formatVnd(item.base_salary)}
                        {item.product_salary > 0 && ` + SP: ${formatVnd(item.product_salary)}`}
                    </div>
                    <div className="tabular-nums text-right font-bold text-h3 shrink-0">
                        {formatVnd(item.net_salary)}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                    <div className="text-caption text-success font-medium">
                        Đã trả: {formatVnd(item.paid_amount)}
                    </div>
                    <div className={cn("text-caption", item.remaining_amount > 0 ? "text-error font-medium" : "text-text-muted")}>
                        Còn lại: {formatVnd(item.remaining_amount)}
                    </div>
                </div>
            </article>
        </SwipeableCard>
    );
}
