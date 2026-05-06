import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { financeMethodLabel, financeStatusLabel, financeStatusVariant, formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import type { LedgerItem } from "@/types/finance-dashboard";

interface RecentTransactionsProps {
  data: LedgerItem[];
}

function transactionHref(item: LedgerItem) {
  if (item.sourceTable === "expenses") return "/finance/expenses";
  if (item.sourceTable === "receipts") return `/finance/receipts/${item.id}`;
  if (item.sourceTable === "payments") {
    return `/finance/receipts/${item.id.startsWith("payment:") ? item.id : `payment:${item.id}`}`;
  }
  return "/finance/cashflow";
}

export function RecentTransactions({ data }: RecentTransactionsProps) {
  return (
    <div className="card-base p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="icon-box bg-primary/10">
            <ReceiptText className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-h3 truncate">Giao dịch gần đây</h3>
        </div>
        <Link href="/finance/cashflow" className="link-base shrink-0 text-caption">
          Sổ cái
        </Link>
      </div>

      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-body-sm text-text-muted">Chưa có giao dịch trong kỳ này.</p>
        ) : (
          data.map((item) => {
            const isInflow = item.direction === "in";
            const DirectionIcon = isInflow ? ArrowDownLeft : ArrowUpRight;
            return (
              <Link key={`${item.sourceTable}-${item.id}`} href={transactionHref(item)} className="card-interactive stagger-item flex items-center gap-3 p-3">
                <div className={isInflow ? "icon-box bg-success/10" : "icon-box bg-error/10"}>
                  <DirectionIcon className={isInflow ? "h-4 w-4 text-success" : "h-4 w-4 text-error"} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold">{item.code || item.description || "Giao dịch"}</p>
                  <p className="text-caption">
                    {formatFinanceDate(item.transactionDate)} · {financeMethodLabel(item.paymentMethod)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={isInflow ? "tabular-nums font-bold text-success" : "tabular-nums font-bold text-error"}>
                    {isInflow ? "+" : "-"}{formatVnd(item.amount)}
                  </p>
                  <Badge variant={financeStatusVariant(item.status)}>{financeStatusLabel(item.status)}</Badge>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
