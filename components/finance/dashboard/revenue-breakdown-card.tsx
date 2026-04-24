import { Layers3 } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { EmptyState } from "@/components/ui/ux-states";
import { getServiceLabel } from "@/types/contract-constants";
import type { ServiceType } from "@/types/contract";
import type { RevenueBreakdownItem } from "@/types/finance-intelligence";

interface RevenueBreakdownCardProps {
  data: RevenueBreakdownItem[];
}

function formatServiceType(value: string) {
  if (!value) return "Khác";
  return getServiceLabel(value as ServiceType);
}

export function RevenueBreakdownCard({ data }: RevenueBreakdownCardProps) {
  const total = data.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return (
    <div className="card-base h-full min-w-0 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-text-muted">Revenue mix</p>
          <h3 className="text-h3">Cơ cấu doanh thu</h3>
        </div>
        <div className="icon-box bg-info/10">
          <Layers3 className="h-4 w-4 text-info" />
        </div>
      </div>

      {data.length === 0 || total === 0 ? (
        <div className="dashboard-surface">
          <EmptyState
            compact
            title="Chưa có hợp đồng trong tháng"
            description="Cần thêm hợp đồng phát sinh để phân tích cơ cấu doanh thu."
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-caption text-text-muted">Tổng giá trị hợp đồng tháng</p>
            <p className="tabular-nums text-h2">{formatVnd(total)}</p>
          </div>

          <div className="space-y-3">
            {data.map((item) => {
              const pct = Math.min(Math.max(Number(item.percentage || 0), 0), 100);

              return (
                <div key={item.service_type} className="dashboard-surface min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-body-sm">
                    <span className="truncate font-medium">{formatServiceType(item.service_type)}</span>
                    <span className="tabular-nums text-caption text-text-muted">{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="h-full rounded-full bg-info" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-caption text-text-secondary">
                    <span>{item.count} hợp đồng</span>
                    <span className="tabular-nums">{formatVnd(item.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
