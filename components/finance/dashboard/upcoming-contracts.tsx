import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FinanceContractListItem } from "@/types/finance-dashboard";
import { financeStatusLabel, financeStatusVariant, formatFinanceDate } from "@/components/finance/finance-format";

interface UpcomingContractsProps {
  data: FinanceContractListItem[];
}

export function UpcomingContracts({ data }: UpcomingContractsProps) {
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="icon-box bg-info/10">
            <Calendar className="w-4 h-4 text-info" />
          </div>
          <h3 className="text-h3 truncate">HĐ sắp chụp</h3>
        </div>
        <Link href="/contracts" className="link-base text-caption shrink-0">
          Xem tất cả
        </Link>
      </div>

      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-body-sm text-text-muted">Chưa có lịch chụp sắp tới.</p>
        ) : (
          data.map((item) => (
            <Link key={item.id} href={`/contracts/${item.id}`} className="card-interactive stagger-item p-3 flex items-center gap-3">
              <div className="icon-box bg-primary/10">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-semibold truncate">
                  {item.customers?.full_name || "Khách vãng lai"}
                </p>
                <p className="text-caption">{item.contract_code || "Chưa có mã HĐ"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-body-sm font-semibold">{formatFinanceDate(item.work_date)}</p>
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
