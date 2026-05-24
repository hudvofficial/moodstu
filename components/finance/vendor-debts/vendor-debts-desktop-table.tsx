import { Button } from "@/components/ui/button";
import { formatVnd } from "@/components/finance/finance-format";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";
import type { VendorDebtItem } from "@/types/vendor";

interface VendorDebtsDesktopTableProps {
  items: VendorDebtItem[];
  onPay: (item: VendorDebtItem) => void;
}

export function VendorDebtsDesktopTable({ items, onPay }: VendorDebtsDesktopTableProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="hidden lg:block">
      <TableWrapper>
        <THead>
          <TR>
            <TH>Vendor</TH>
            <TH>Loại dịch vụ</TH>
            <TH className="text-right">Số task</TH>
            <TH className="text-right">Tổng chi phí</TH>
            <TH className="text-right">Đã trả</TH>
            <TH className="text-right">Còn nợ</TH>
            <TH>Task gần nhất</TH>
            <TH>TT gần nhất</TH>
            <TH className="text-right w-32">Thao tác</TH>
          </TR>
        </THead>
        <TBody>
          {items.map((item) => (
            <TR key={item.vendor_id}>
              <TD>
                <div className="font-semibold text-text-primary">{item.vendor_name}</div>
                <div className="text-caption text-text-muted">{item.vendor_phone || "Chưa có SĐT"}</div>
              </TD>
              <TD>
                <span className="text-caption text-text-muted">{item.service_type || "-"}</span>
              </TD>
              <TD className="text-right tabular-nums">{item.task_count}</TD>
              <TD className="text-right tabular-nums">{formatVnd(item.total_cost)}</TD>
              <TD className="text-right tabular-nums text-success">{formatVnd(item.total_paid)}</TD>
              <TD
                className={cn(
                  "text-right tabular-nums font-bold",
                  item.remaining > 0 ? "text-error" : "text-text-muted"
                )}
              >
                {formatVnd(item.remaining)}
              </TD>
              <TD>
                <span className="text-caption text-text-muted">{formatDate(item.last_task_date)}</span>
              </TD>
              <TD>
                <span className="text-caption text-text-muted">{formatDate(item.last_payment_date)}</span>
              </TD>
              <TD className="text-right">
                <Button size="sm" variant="primary" onClick={() => onPay(item)} disabled={item.remaining <= 0}>
                  <DollarSign className="w-4 h-4 mr-1" />
                  Thanh toán
                </Button>
              </TD>
            </TR>
          ))}
          {items.length === 0 && (
            <TR>
              <TD colSpan={9} className="py-7 text-center text-text-muted">
                Không có vendor nào đang nợ tiền.
              </TD>
            </TR>
          )}
        </TBody>
      </TableWrapper>
    </div>
  );
}
