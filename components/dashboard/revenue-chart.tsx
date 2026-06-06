"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { TrendingUp } from "lucide-react";
import { formatVnd } from "@/lib/utils";
import type { RevenueChartData } from "@/types/dashboard";

interface RevenueChartProps {
  data: RevenueChartData[];
  canView: boolean;
  periodLabel?: string;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-border bg-bg-base/50 px-4 text-center text-body-sm text-text-secondary">
      {message}
    </div>
  );
}

export function RevenueChart({
  data,
  canView,
  periodLabel = "6 tháng gần nhất",
}: RevenueChartProps) {
  return (
    <div
      className="card-base h-full p-5 entrance entrance-3 chart-container"
      role="img"
      aria-label="Biểu đồ doanh thu theo tháng"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="icon-box bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-h3">Doanh thu theo tháng</h3>
        </div>
        <span className="shrink-0 text-caption">{periodLabel}</span>
      </div>

      {!canView ? (
        <EmptyState message="Vai trò hiện tại không có quyền xem dữ liệu doanh thu." />
      ) : data.length === 0 || data.every((item) => item.revenue === 0) ? (
        <EmptyState message="Chưa có doanh thu trong kỳ hiển thị." />
      ) : (
        <div className="chart-focus-reset h-52 lg:h-64">
          <SafeResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="var(--color-text-muted)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                stroke="var(--color-text-muted)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value) =>
                  `${Math.round(Number(value) / 1_000_000)}tr`
                }
                width={45}
              />
              <Tooltip
                cursor={{ fill: "var(--color-bg-hover)" }}
                formatter={(value) => [formatVnd(Number(value)), "Doanh thu"]}
                contentStyle={{
                  backgroundColor: "var(--color-bg-card)",
                  borderColor: "var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "13px",
                }}
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-primary)"
                radius={[6, 6, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      )}
    </div>
  );
}
