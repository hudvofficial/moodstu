import { ArrowDownRight, ArrowRight, ArrowUpRight, PackageOpen } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/ux-states";
import type { InventoryCategory } from "@/lib/validations/inventory.schema";
import { INVENTORY_CATEGORY_MAP } from "@/types/inventory-constants";
import type { InventoryCostItem } from "@/types/finance-intelligence";

interface InventoryCostsCardProps {
  data: InventoryCostItem[];
}

type ChangeConfig = {
  icon: typeof ArrowRight;
  variant: BadgeVariant;
  label: string;
};

function changeConfig(change: number): ChangeConfig {
  if (change > 0) return { icon: ArrowUpRight, variant: "warning", label: `+${change}%` };
  if (change < 0) return { icon: ArrowDownRight, variant: "success", label: `${change}%` };
  return { icon: ArrowRight, variant: "neutral", label: "0%" };
}

function getInventoryCategoryLabel(category: string) {
  const mapped = INVENTORY_CATEGORY_MAP[category as InventoryCategory];
  if (mapped) return mapped.label;
  if (!category) return "Khác";

  return category
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function InventoryCostsCard({ data }: InventoryCostsCardProps) {
  const currentMonthItems = data
    .filter((item) => Number(item.thisMonth || 0) > 0)
    .sort((left, right) => Number(right.thisMonth || 0) - Number(left.thisMonth || 0));

  const total = currentMonthItems.reduce((sum, item) => sum + Number(item.thisMonth || 0), 0);
  const previousTotal = data.reduce((sum, item) => sum + Number(item.lastMonth || 0), 0);
  const hasCurrentMonthBurn = total > 0;

  return (
    <div className="card-base h-full min-w-0 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-text-muted">Inventory burn</p>
          <h3 className="text-h3">Chi phí vật tư</h3>
        </div>
        <div className="icon-box bg-warning/10">
          <PackageOpen className="h-4 w-4 text-warning" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-caption text-text-muted">Tổng chi phí xuất kho</p>
          <p className="tabular-nums text-h2">{formatVnd(total)}</p>
          {previousTotal > 0 ? (
            <p className="mt-1 text-caption text-text-secondary">Tháng trước: {formatVnd(previousTotal)}</p>
          ) : null}
        </div>

        {!hasCurrentMonthBurn ? (
          <div className="dashboard-surface border-dashed border-border/70 bg-bg-hover/40">
            <EmptyState
              compact
              title="Chưa có xuất kho trong tháng"
              description={
                previousTotal > 0
                  ? `Tháng này chưa phát sinh xuất kho. Tháng trước là ${formatVnd(previousTotal)}.`
                  : "Tháng này chưa phát sinh xuất kho vật tư."
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {currentMonthItems.map((item) => {
              const change = Number(item.change || 0);
              const config = changeConfig(change);
              const Icon = config.icon;
              const pct = total > 0 ? Math.min((Number(item.thisMonth || 0) / total) * 100, 100) : 0;

              return (
                <div key={item.category} className="dashboard-surface min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-body-sm font-medium">
                      {getInventoryCategoryLabel(item.category)}
                    </span>
                    <Badge variant={config.variant} className="shrink-0 normal-case tracking-normal">
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>

                  <div className="progress-track">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-caption text-text-secondary">
                    <span>Tháng trước: {formatVnd(item.lastMonth)}</span>
                    <span className="tabular-nums font-semibold text-text-primary">{formatVnd(item.thisMonth)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
