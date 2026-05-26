import { Check, Trash2, Eye, Printer, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExpenseListItem } from "@/types/finance-operations";

interface ExpenseRowActionsProps {
  item: ExpenseListItem;
  busyId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ExpenseListItem) => void;
  onView: (id: string) => void;
  onPrint: (id: string) => void;
}

export function ExpenseRowActions({
  item,
  busyId,
  onApprove,
  onDelete,
  onEdit,
  onView,
  onPrint,
}: ExpenseRowActionsProps) {
  const strokeWg = 1.75;
  const linkClassName = "btn-icon text-text-secondary";

  // Override cứng bằng inline CSS để chống lại bất kỳ rules nào từ global CSS
  const btnStyle = { padding: 0 };
  const iconStyle = { width: 20, height: 20 };

  const isAuto = item.description?.includes("[Auto-");

  return (
    <div className="flex items-center justify-end gap-1.5 min-w-max">
      <Button
        type="button"
        variant="ghost"
        className={linkClassName}
        style={btnStyle}
        onClick={() => onView(item.id)}
        title="Xem chi tiết"
      >
        <Eye style={iconStyle} strokeWidth={strokeWg} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={linkClassName}
        style={btnStyle}
        onClick={() => onPrint(item.id)}
        title="In phiếu"
      >
        <Printer style={iconStyle} strokeWidth={strokeWg} />
      </Button>

      {!item.approved_by && (
        <>
          <Button
            type="button"
            variant="ghost"
            className={linkClassName}
            style={btnStyle}
            onClick={() => onEdit(item)}
            disabled={busyId === item.id || isAuto}
            title={isAuto ? "Chứng từ tự động (Vui lòng thao tác ở phân hệ gốc)" : "Sửa phiếu"}
          >
            <Edit3 style={iconStyle} strokeWidth={strokeWg} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={`btn-icon ${busyId === item.id || isAuto
                ? "text-text-muted opacity-50"
                : "text-interactive hover:bg-interactive/10 hover:text-interactive-hover"
              }`}
            style={btnStyle}
            onClick={() => onApprove(item.id)}
            disabled={busyId === item.id || isAuto}
            title={isAuto ? "Chứng từ tự động" : "Duyệt chi"}
          >
            <Check style={iconStyle} strokeWidth={strokeWg} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={`btn-icon ${busyId === item.id || isAuto
                ? (busyId === item.id ? "animate-pulse " : "") + "text-text-muted opacity-50"
                : "text-error hover:text-error hover:bg-error/10"
              }`}
            style={btnStyle}
            onClick={() => onDelete(item.id)}
            disabled={busyId === item.id || isAuto}
            title={isAuto ? "Chứng từ tự động (Vui lòng thao tác ở phân hệ gốc)" : "Xóa phiếu"}
          >
            <Trash2 style={iconStyle} strokeWidth={strokeWg} />
          </Button>
        </>
      )}
    </div>
  );
}
