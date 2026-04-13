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

interface ServiceDonutChartProps {
  data: ServiceDistributionItem[];
}

export function ServiceDonutChart({ data }: ServiceDonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card-base h-full p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="icon-box bg-info/10">
          <PieChartIcon className="w-4 h-4 text-info" />
        </div>
        <h3 className="text-h3">Phân bổ dịch vụ</h3>
      </div>

      {total === 0 ? (
        <div className="h-64 grid place-items-center text-body-sm text-text-muted">
          Chưa có hợp đồng trong tháng.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(120px,160px)] items-center">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={2}>
                  {data.map((item, index) => (
                    <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, item) => [
                    `${value} HĐ - ${formatVnd(Number(item.payload.revenue))}`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--color-bg-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "var(--radius-md)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-body-sm">
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
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
