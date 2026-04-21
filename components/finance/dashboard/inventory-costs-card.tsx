import { ArrowDownRight, ArrowRight, ArrowUpRight, PackageOpen } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { cn } from "@/lib/utils";
import type { InventoryCostItem } from "@/types/finance-intelligence";

interface InventoryCostsCardProps {
  data: InventoryCostItem[];
}

function changeConfig(change: number) {
  if (change > 0) return { icon: ArrowUpRight, className: "text-warning bg-warning/10", label: `+${change}%` };
  if (change < 0) return { icon: ArrowDownRight, className: "text-success bg-success/10", label: `${change}%` };
  return { icon: ArrowRight, className: "text-text-muted bg-bg-hover", label: "0%" };
}

export function InventoryCostsCard({ data }: InventoryCostsCardProps) {
  const total = data.reduce((sum, item) => sum + Number(item.thisMonth || 0), 0);

  return (
    <div className="card-base h-full p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-text-muted">Inventory burn</p>
          <h3 className="text-h3">Chi phí vật tư</h3>
        </div>
        <div className="icon-box bg-warning/10">
          <PackageOpen className="h-4 w-4 text-warning" />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="grid h-48 place-items-center text-body-sm text-text-muted">
          Chưa có xuất kho trong tháng.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-caption text-text-muted">Tổng chi phí xuất kho</p>
            <p className="tabular-nums text-h2">{formatVnd(total)}</p>
          </div>

          <div className="space-y-3">
            {data.map((item) => {
              const change = Number(item.change || 0);
              const config = changeConfig(change);
              const Icon = config.icon;
              const pct = total > 0 ? Math.min((Number(item.thisMonth || 0) / total) * 100, 100) : 0;

              return (
                <div key={item.category}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate text-body-sm font-medium">{item.category}</span>
                    <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold", config.className)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-caption text-text-secondary">
                    <span>Tháng trước: {formatVnd(item.lastMonth)}</span>
                    <span className="tabular-nums font-semibold text-text-primary">{formatVnd(item.thisMonth)}</span>
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
