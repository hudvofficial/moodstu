"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import type { RevenueByMonthItem } from "@/types/finance-dashboard";
import { formatVnd } from "@/components/finance/finance-format";

interface RevenueBarChartProps {
  data: RevenueByMonthItem[];
  selectedMonth: number;
}

export function RevenueBarChart({ data, selectedMonth }: RevenueBarChartProps) {
  const chartData = data
    .filter((item) => item.rawMonth <= selectedMonth)
    .slice(-6);

  return (
    <div className="card-base h-full p-5">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="icon-box bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-h3 truncate">Doanh thu theo tháng</h3>
        </div>
        <span className="text-caption shrink-0">6 tháng gần nhất</span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 grid place-items-center text-body-sm text-text-muted">
          Chưa có dữ liệu doanh thu.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-text-muted)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}tr`}
              />
              <Tooltip
                cursor={{ fill: "var(--color-bg-hover)" }}
                formatter={(value) => [formatVnd(Number(value)), "Doanh thu"]}
                contentStyle={{
                  backgroundColor: "var(--color-bg-card)",
                  borderColor: "var(--color-border)",
                  borderRadius: "var(--radius-md)",
                }}
              />
              <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
