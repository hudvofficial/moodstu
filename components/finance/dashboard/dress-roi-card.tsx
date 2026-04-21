import { Shirt, TrendingUp } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { cn } from "@/lib/utils";
import type { DressRoiItem } from "@/types/finance-intelligence";

interface DressRoiCardProps {
  data: DressRoiItem[];
}

function roiClass(roi: number) {
  if (roi >= 100) return "bg-success/10 text-success";
  if (roi >= 0) return "bg-info/10 text-info";
  return "bg-error/10 text-error";
}

export function DressRoiCard({ data }: DressRoiCardProps) {
  return (
    <div className="card-base h-full p-4">
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
        <div className="grid h-48 place-items-center text-body-sm text-text-muted">
          Chưa có dữ liệu thuê váy.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => {
            const roi = Number(item.roi || 0);
            const width = Math.min(Math.max(roi, 0), 160);

            return (
              <div key={item.id} className="rounded-xl border border-border bg-bg-hover p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold">{item.name}</p>
                    <p className="text-caption text-text-muted">{item.code}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-caption font-bold", roiClass(roi))}>
                    {roi.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                  </span>
                </div>

                <div className="progress-track">
                  <div className="h-full rounded-full bg-success" style={{ width: `${width}%` }} />
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-caption text-text-secondary">
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
