import { Eye, Printer, Trash2, Banknote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SalaryItem } from "@/types/finance-operations";

interface SalaryRowActionsProps {
    item: SalaryItem;
    onPay: (item: SalaryItem) => void;
    onPrint: (item: SalaryItem) => void;
    onView: (item: SalaryItem) => void;
    onAdjust: (item: SalaryItem) => void;
    onDelete: (item: SalaryItem) => void;
}

export function SalaryRowActions({ item, onPay, onPrint, onView, onAdjust, onDelete }: SalaryRowActionsProps) {
    const strokeWg = 1.75;
    const linkClassName = "btn-icon text-text-secondary";

    // Override cứng bằng inline CSS để chống lại bất kỳ rules nào từ global CSS
    const btnStyle = { padding: 0 };
    const iconStyle = { width: 20, height: 20 };

    return (
        <div className="flex flex-row items-center justify-end gap-1.5 min-w-max pr-2 opacity-80 hover:opacity-100 transition-opacity">
            <Button
                type="button"
                variant="ghost"
                onClick={() => onPay(item)}
                title="Thanh toán"
                disabled={item.remaining_amount <= 0}
                className={`btn-icon ${item.remaining_amount <= 0 ? "text-text-muted" : "text-success hover:text-success hover:bg-success/10"
                    }`}
                style={btnStyle}
                aria-label="Thanh toán"
            >
                <Banknote style={iconStyle} strokeWidth={strokeWg} />
            </Button>
            <Button
                type="button"
                variant="ghost"
                onClick={() => onPrint(item)}
                title="In Phiếu"
                className={linkClassName}
                style={btnStyle}
                aria-label="In phiếu"
            >
                <Printer style={iconStyle} strokeWidth={strokeWg} />
            </Button>

            <div className="w-px h-4 bg-border my-auto mx-1" />

            <Button
                type="button"
                variant="ghost"
                onClick={() => onView(item)}
                title="Chi Tiết / Phụ cấp"
                className={linkClassName}
                style={btnStyle}
                aria-label="Chi tiết"
            >
                <Eye style={iconStyle} strokeWidth={strokeWg} />
            </Button>
            <Button
                type="button"
                variant="ghost"
                onClick={() => onAdjust(item)}
                title="Thêm Thưởng/Phạt"
                className={linkClassName}
                style={btnStyle}
                aria-label="Thưởng phạt"
            >
                <Plus style={iconStyle} strokeWidth={strokeWg} />
            </Button>
            <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(item)}
                title="Xóa nhân sự khỏi Tháng"
                className="btn-icon text-error hover:text-error hover:bg-error/10"
                style={btnStyle}
                aria-label="Xóa"
            >
                <Trash2 style={iconStyle} strokeWidth={strokeWg} />
            </Button>
        </div>
    );
}
