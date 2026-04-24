import { Shirt, TrendingUp } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/ux-states";
import type { DressRoiItem } from "@/types/finance-intelligence";

interface DressRoiCardProps {
  data: DressRoiItem[];
}

function roiVariant(roi: number): BadgeVariant {
  if (roi >= 100) return "success";
  if (roi >= 0) return "info";
  return "error";
}

export function DressRoiCard({ data }: DressRoiCardProps) {
  return (
    <div className="card-base h-full min-w-0 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-text-muted">Dress ROI</p>
          <h3 className="text-h3">Hiệu suất váy</h3>
        </div>
        <div className="icon-box bg-success/10">
          <Shirt className="h-4 w-4 text-success" />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="dashboard-surface">
          <EmptyState
            compact
            title="Chưa có dữ liệu thuê váy"
            description="Cần thêm lượt thuê để tính hiệu suất hoàn vốn."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => {
            const roi = Number(item.roi || 0);
            const width = Math.min(Math.max(roi, 0), 160);

            return (
              <div key={item.id} className="dashboard-surface min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold">{item.name}</p>
                    <p className="text-caption text-text-muted">{item.code}</p>
                  </div>
                  <Badge variant={roiVariant(roi)} className="shrink-0 normal-case tracking-normal">
                    {roi.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                  </Badge>
                </div>

                <div className="progress-track">
                  <div className="h-full rounded-full bg-success" style={{ width: `${width}%` }} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-caption text-text-secondary">
                  <div>
                    <p>Vốn</p>
                    <p className="tabular-nums font-semibold text-text-primary">{formatVnd(item.purchasePrice)}</p>
                  </div>
                  <div>
                    <p>Doanh thu</p>
                    <p className="tabular-nums font-semibold text-text-primary">{formatVnd(item.totalRevenue)}</p>
                  </div>
                  <div>
                    <p>Lượt thuê</p>
                    <p className="tabular-nums font-semibold text-text-primary">{item.totalRentals}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-caption text-text-muted">
        <TrendingUp className="h-3.5 w-3.5" />
        ROI tính từ doanh thu thuê so với giá nhập.
      </div>
    </div>
  );
}
