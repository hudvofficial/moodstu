import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FinanceContractListItem } from "@/types/finance-dashboard";
import { financeStatusLabel, financeStatusVariant, formatFinanceDate, formatVnd } from "@/components/finance/finance-format";

interface PendingCollectionsProps {
  data: FinanceContractListItem[];
}

export function PendingCollections({ data }: PendingCollectionsProps) {
  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="icon-box bg-warning/10">
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          <h3 className="text-h3 truncate">Cần thu tiền</h3>
        </div>
        <Link href="/finance/debts" className="link-base text-caption shrink-0">
          Công nợ KH
        </Link>
      </div>

      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-body-sm text-text-muted">Không có khoản cần thu.</p>
        ) : (
          data.map((item) => (
            <Link key={item.id} href={`/contracts/${item.id}`} className="card-interactive stagger-item p-3 flex items-center gap-3">
              <div className="icon-box bg-warning/10">
                <AlertCircle className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-semibold truncate">
                  {item.customers?.full_name || "Khách vãng lai"}
                </p>
                <p className="text-caption">{item.contract_code || formatFinanceDate(item.contract_date)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="tabular-nums font-bold text-error">
                  {formatVnd(Number(item.remaining_amount) || 0)}
                </p>
                <Badge variant={financeStatusVariant(item.status)}>{financeStatusLabel(item.status)}</Badge>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
