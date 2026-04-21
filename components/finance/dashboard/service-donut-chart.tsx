"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import type { ServiceDistributionItem } from "@/types/finance-dashboard";
import { formatVnd } from "@/components/finance/finance-format";

const COLORS = [
  "var(--color-primary)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-interactive)",
];

const COLOR_CLASSES = [
  "bg-primary",
  "bg-info",
  "bg-success",
  "bg-warning",
  "bg-interactive",
];

interface ServiceDonutChartProps {
  data: ServiceDistributionItem[];
  title?: string;
  emptyText?: string;
}

interface ServiceTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: ServiceDistributionItem;
  }>;
}

function ServiceDonutTooltip({ active, payload }: ServiceTooltipProps) {
  const item = payload?.[0]?.payload;

  if (!active || !item) return null;

  return (
    <div className="card-base min-w-40 p-3">
      <p className="text-body-sm font-semibold text-text-primary">{item.name}</p>
      <div className="mt-2 space-y-1 text-caption text-text-secondary">
        <div className="flex items-center justify-between gap-3">
          <span>Số hợp đồng</span>
          <span className="tabular-nums font-semibold text-text-primary">{item.value}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Doanh thu</span>
          <span className="tabular-nums font-semibold text-text-primary">{formatVnd(Number(item.revenue))}</span>
        </div>
      </div>
    </div>
  );
}

export function ServiceDonutChart({
  data,
  title = "Phân bổ dịch vụ",
  emptyText = "Chưa có hợp đồng trong tháng.",
}: ServiceDonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card-base h-full p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="icon-box bg-info/10">
          <PieChartIcon className="h-4 w-4 text-info" />
        </div>
        <h3 className="text-h3">{title}</h3>
      </div>

      {total === 0 ? (
        <div className="grid h-64 place-items-center text-body-sm text-text-muted">
          {emptyText}
        </div>
      ) : (
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(120px,160px)]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={2}>
                  {data.map((item, index) => (
                    <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ServiceDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-body-sm">
                <span className={`size-3 shrink-0 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`} />
                <span className="flex-1 truncate">{item.name}</span>
                <span className="tabular-nums font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
