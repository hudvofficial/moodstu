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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="icon-box bg-warning/10">
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
          <h3 className="text-h3 truncate">Cần thu tiền</h3>
        </div>
        <Link href="/finance/debts" className="link-base shrink-0 text-caption">
          Công nợ KH
        </Link>
      </div>

      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-body-sm text-text-muted">Không có khoản cần thu.</p>
        ) : (
          data.map((item) => (
            <Link key={item.id} href={`/contracts/${item.id}`} className="card-interactive stagger-item flex items-center gap-3 p-3">
              <div className="icon-box bg-warning/10">
                <AlertCircle className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-body-sm font-semibold">
                  {item.customers?.full_name || "Khách vãng lai"}
                </p>
                <p className="text-caption">
                  {item.contract_code || formatFinanceDate(item.contract_date)}
                  {item.delivered_at ? ` · giao ${formatFinanceDate(item.delivered_at)}` : item.work_date ? ` · chụp ${formatFinanceDate(item.work_date)}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular-nums font-bold text-error">
                  {formatVnd(Number(item.remaining_amount) || 0)}
                </p>
                {/* M3: đến hạn thu = đã giao sản phẩm; chưa giao = chờ giao (không phải quá hạn) */}
                {item.delivered_at ? (
                  <Badge variant="error">Đã giao chưa thu</Badge>
                ) : (
                  <Badge variant={financeStatusVariant(item.status)}>{item.status ? "Chờ giao" : financeStatusLabel(item.status)}</Badge>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
