import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { LedgerItem } from "@/types/finance-dashboard";
import { Badge } from "@/components/ui/badge";
import { financeMethodLabel, financeStatusLabel, financeStatusVariant, formatFinanceDate, formatVnd } from "@/components/finance/finance-format";

interface LedgerMobileListProps {
  items: LedgerItem[];
}

export function LedgerMobileList({ items }: LedgerMobileListProps) {
  if (items.length === 0) {
    return (
      <div className="lg:hidden card-base p-5 text-body-sm text-text-muted">
        Chưa có giao dịch trong kỳ này.
      </div>
    );
  }

  return (
    <div className="lg:hidden space-y-3">
      {items.map((item) => {
        const isIn = item.direction === "in";
        const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
        return (
          <div key={`${item.sourceTable}-${item.id}`} className="card-interactive stagger-item p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className={isIn ? "icon-box bg-success/10" : "icon-box bg-error/10"}>
                  <Icon className={isIn ? "w-4 h-4 text-success" : "w-4 h-4 text-error"} />
                </div>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold truncate">{item.code}</p>
                  <p className="text-caption">{formatFinanceDate(item.transactionDate)}</p>
                </div>
              </div>
              <span className={`tabular-nums font-bold shrink-0 ${isIn ? "text-success" : "text-error"}`}>
                {isIn ? "+" : "-"}{formatVnd(item.amount)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-body-sm">
              <div className="min-w-0">
                <p className="truncate">{item.customerName}</p>
                <p className="text-caption truncate">{item.categoryName} · {financeMethodLabel(item.paymentMethod)}</p>
              </div>
              <Badge variant={financeStatusVariant(item.status)}>{financeStatusLabel(item.status)}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
