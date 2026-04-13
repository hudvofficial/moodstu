import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { LedgerItem } from "@/types/finance-dashboard";
import { Badge } from "@/components/ui/badge";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { financeMethodLabel, financeStatusLabel, financeStatusVariant, formatFinanceDate, formatVnd } from "@/components/finance/finance-format";

interface LedgerDesktopTableProps {
  items: LedgerItem[];
}

export function LedgerDesktopTable({ items }: LedgerDesktopTableProps) {
  return (
    <TableWrapper containerClassName="hidden lg:block">
      <THead>
        <tr>
          <TH>Ngày</TH>
          <TH>Loại</TH>
          <TH>Mã giao dịch</TH>
          <TH>Đối tượng</TH>
          <TH>Danh mục</TH>
          <TH>Phương thức</TH>
          <TH>Trạng thái</TH>
          <TH className="text-right">Số tiền</TH>
        </tr>
      </THead>
      <TBody>
        {items.length === 0 ? (
          <TR>
            <TD colSpan={8} className="py-7 text-center text-text-muted">
              Chưa có giao dịch trong kỳ này.
            </TD>
          </TR>
        ) : (
          items.map((item) => {
            const isIn = item.direction === "in";
            const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
            return (
              <TR key={`${item.sourceTable}-${item.id}`}>
                <TD className="text-text-secondary">{formatFinanceDate(item.transactionDate)}</TD>
                <TD>
                  <span className={`badge ${isIn ? "badge-success" : "badge-error"}`}>
                    <Icon className="w-3 h-3" />
                    {isIn ? "Thu" : "Chi"}
                  </span>
                </TD>
                <TD><span className="font-semibold">{item.code}</span></TD>
                <TD>{item.customerName}</TD>
                <TD>{item.categoryName}</TD>
                <TD>{financeMethodLabel(item.paymentMethod)}</TD>
                <TD><Badge variant={financeStatusVariant(item.status)}>{financeStatusLabel(item.status)}</Badge></TD>
                <TD className="text-right">
                  <span className={`tabular-nums font-bold ${isIn ? "text-success" : "text-error"}`}>
                    {isIn ? "+" : "-"}{formatVnd(item.amount)}
                  </span>
                </TD>
              </TR>
            );
          })
        )}
      </TBody>
    </TableWrapper>
  );
}
