import { Banknote, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PAYEE_TYPE_LABEL, type PayableRow } from "@/types/payables";

interface PayablesDesktopTableProps {
  items: PayableRow[];
  onPay: (item: PayableRow) => void;
  onHistory: (item: PayableRow) => void;
}

const TYPE_VARIANT: Record<PayableRow["payee_type"], "info" | "warning" | "primary" | "success"> = {
  lab: "info",
  vendor: "warning",
  supplier: "primary",
  employee: "success",
};

export function PayablesDesktopTable({ items, onPay, onHistory }: PayablesDesktopTableProps) {
  return (
    <TableWrapper>
      <THead>
        <TR>
          <TH>Đối tác</TH>
          <TH className="text-right">Số khoản</TH>
          <TH className="text-right">Cam kết</TH>
          <TH className="text-right">Đã trả</TH>
          <TH className="text-right">Còn nợ</TH>
          <TH>Khoản gần nhất</TH>
          <TH>Trả gần nhất</TH>
          <TH className="text-right w-24">Thao tác</TH>
        </TR>
      </THead>
      <TBody>
        {items.map((item) => (
          <TR key={`${item.payee_type}:${item.payee_id}`}>
            <TD>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">{item.payee_name}</span>
                <Badge variant={TYPE_VARIANT[item.payee_type]}>{PAYEE_TYPE_LABEL[item.payee_type]}</Badge>
              </div>
            </TD>
            <TD className="text-right tabular-nums">{item.item_count}</TD>
            <TD className="text-right tabular-nums font-medium">{formatVnd(item.total_committed)}</TD>
            <TD className={cn("text-right tabular-nums", item.total_paid > 0 ? "text-success" : "text-text-muted")}>
              {formatVnd(item.total_paid)}
            </TD>
            <TD className={cn("text-right tabular-nums font-bold", item.remaining > 0 ? "text-error" : "text-text-muted")}>
              {formatVnd(item.remaining)}
            </TD>
            <TD>
              <span className="text-caption text-text-muted">{formatFinanceDate(item.last_item_date)}</span>
            </TD>
            <TD>
              <span className="text-caption text-text-muted">{formatFinanceDate(item.last_payment_date)}</span>
            </TD>
            <TD className="text-right">
              <div className="flex items-center justify-end pr-2 gap-1 opacity-80 hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onHistory(item)}
                  title="Lịch sử thanh toán"
                  className="btn-icon text-text-muted hover:text-text-primary hover:bg-bg-hover"
                  style={{ padding: 0 }}
                  aria-label="Lịch sử thanh toán"
                >
                  <History style={{ width: 20, height: 20 }} strokeWidth={1.75} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onPay(item)}
                  title="Thanh toán"
                  disabled={item.remaining <= 0}
                  className={cn(
                    "btn-icon",
                    item.remaining <= 0 ? "text-text-muted" : "text-success hover:text-success hover:bg-success/10",
                  )}
                  style={{ padding: 0 }}
                  aria-label="Thanh toán"
                >
                  <Banknote style={{ width: 20, height: 20 }} strokeWidth={1.75} />
                </Button>
              </div>
            </TD>
          </TR>
        ))}
        {items.length === 0 && (
          <TR>
            <TD colSpan={8} className="py-7 text-center text-text-muted">
              Không có công nợ phải trả.
            </TD>
          </TR>
        )}
      </TBody>
    </TableWrapper>
  );
}
