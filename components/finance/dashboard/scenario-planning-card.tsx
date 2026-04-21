import { Activity, Rocket, TrendingDown } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { cn } from "@/lib/utils";
import type { ScenarioProjection } from "@/types/finance-intelligence";

interface ScenarioPlanningCardProps {
  data: ScenarioProjection[];
}

const scenarioConfig = {
  conservative: {
    icon: TrendingDown,
    label: "Thận trọng",
    className: "bg-warning/10 text-warning",
  },
  base: {
    icon: Activity,
    label: "Cơ sở",
    className: "bg-info/10 text-info",
  },
  aggressive: {
    icon: Rocket,
    label: "Tăng trưởng",
    className: "bg-success/10 text-success",
  },
} satisfies Record<ScenarioProjection["type"], { icon: typeof Activity; label: string; className: string }>;

export function ScenarioPlanningCard({ data }: ScenarioPlanningCardProps) {
  if (!data || data.length === 0) {
    return (
      <div className="stats-card grid min-h-64 place-items-center text-body-sm text-text-muted">
        Chưa có dữ liệu kịch bản tài chính.
      </div>
    );
  }

  return (
    <div className="card-base h-full p-4">
      <div className="mb-4">
        <p className="text-overline text-text-muted">Scenario planning</p>
        <h3 className="text-h3">Dự phóng tài chính</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {data.map((scenario) => {
          const config = scenarioConfig[scenario.type];
          const Icon = config.icon;

          return (
            <div key={scenario.type} className="rounded-xl border border-border bg-bg-hover p-3">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className={cn("icon-box", config.className)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-caption font-bold", config.className)}>
                  {config.label}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-caption text-text-muted">Doanh thu tháng tới</p>
                  <p className="tabular-nums text-h3">{formatVnd(scenario.nextMonthRevenue)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-caption">
                  <div>
                    <p className="text-text-muted">Lợi nhuận</p>
                    <p className="tabular-nums font-semibold text-text-primary">{formatVnd(scenario.nextMonthProfit)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">3 tháng</p>
                    <p className="tabular-nums font-semibold text-text-primary">{formatVnd(scenario.threeMonthRevenue)}</p>
                  </div>
                </div>
                <p className="line-clamp-2 text-caption text-text-secondary">{scenario.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
