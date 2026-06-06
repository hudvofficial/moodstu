"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatVnd } from "@/lib/utils";
import type { ServiceBreakdownData } from "@/types/dashboard";

interface ServicePieChartProps {
  data: ServiceBreakdownData[];
  canView: boolean;
  showRevenue: boolean;
}

interface ServiceTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: ServiceBreakdownData;
  }>;
  showRevenue: boolean;
}

function ServiceTooltip({ active, payload, showRevenue }: ServiceTooltipProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="card-base min-w-40 p-3 shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: item.fill }}
        />
        <p className="text-body-sm font-semibold text-text-primary">
          {item.name}
        </p>
      </div>
      <div className="space-y-1 text-caption text-text-secondary">
        <div className="flex items-center justify-between gap-3">
          <span>Số hợp đồng</span>
          <span className="tabular-nums font-semibold text-text-primary">
            {item.count}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Tỷ lệ</span>
          <span className="tabular-nums font-semibold text-text-primary">
            {item.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
          </span>
        </div>
        {showRevenue ? (
          <div className="flex items-center justify-between gap-3">
            <span>Doanh thu</span>
            <span className="tabular-nums font-semibold text-text-primary">
              {formatVnd(item.revenue)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border bg-bg-base/50 px-4 text-center text-body-sm text-text-secondary">
      {message}
    </div>
  );
}

export function ServicePieChart({ data, canView, showRevenue }: ServicePieChartProps) {
  return (
    <div
      className="card-base h-full p-5 entrance entrance-4 chart-container"
      role="img"
      aria-label="Biểu đồ phân bổ dịch vụ"
    >
      <div className="mb-5 flex items-center gap-2">
        <div className="icon-box bg-accent/10">
          <PieChartIcon className="h-4 w-4 text-accent" />
        </div>
        <h3 className="text-h3">Phân bổ dịch vụ</h3>
      </div>

      {!canView ? (
        <EmptyState message="Vai trò hiện tại không có quyền xem dữ liệu hợp đồng." />
      ) : data.length === 0 ? (
        <EmptyState message="Chưa có hợp đồng trong tháng này." />
      ) : (
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(100px,140px)]">
          <div className="h-52 lg:h-56">
            <SafeResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={2}
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {data.map((item) => (
                    <Cell key={item.serviceType} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={<ServiceTooltip showRevenue={showRevenue} />}
                />
              </PieChart>
            </SafeResponsiveContainer>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            {data.map((item) => (
              <div key={item.serviceType} className="flex min-w-0 items-center gap-2">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="min-w-0 flex-1 truncate text-body-sm">
                  {item.name}
                </span>
                <span className="shrink-0 text-label font-bold tabular-nums">
                  {item.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
