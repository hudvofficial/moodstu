"use client";

import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { TrendingUp } from "lucide-react";
import type { RevenueByMonthItem } from "@/types/finance-dashboard";
import { formatVnd } from "@/components/finance/finance-format";
import { cn } from "@/lib/utils";

interface RevenueBarChartProps {
  data: RevenueByMonthItem[];
  selectedMonth: number;
}

interface MonthTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload?: RevenueByMonthItem }>;
}

const SERIES_LABEL: Record<string, string> = {
  revenue: "Doanh thu",
  cashIn: "Tiền thu",
};

// ADR-016 M2: hai cột khác nghĩa — "Doanh thu" theo ngày CHỤP (lãi/lỗ), "Tiền thu" theo ngày PHIẾU (két).
function MonthTooltip({ active, label, payload }: MonthTooltipProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  const rows: Array<[string, number, string?]> = [
    ["Doanh thu", item.revenue],
    ["Chi phí", item.cost],
    ["Lãi/lỗ", item.profit, item.profit >= 0 ? "text-success" : "text-error"],
    ["Tiền thu", item.cashIn],
    ["Tiền chi", item.cashOut],
  ];

  return (
    <div className="card-base min-w-44 p-3">
      <p className="text-body-sm font-semibold text-text-primary">{label}</p>
      <div className="mt-2 space-y-1 text-caption text-text-secondary">
        {rows.map(([name, value, className]) => (
          <div key={name} className="flex items-center justify-between gap-3">
            <span>{name}</span>
            <span className={cn("tabular-nums font-semibold text-text-primary", className)}>{formatVnd(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueBarChart({ data, selectedMonth }: RevenueBarChartProps) {
  const chartData = data
    .filter((item) => item.rawMonth <= selectedMonth)
    .slice(-6);

  return (
    <div className="card-base h-full p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="icon-box bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-h3 truncate">Doanh thu & tiền thu theo tháng</h3>
            <p className="text-caption text-text-muted truncate">Doanh thu theo ngày chụp · tiền thu theo ngày phiếu</p>
          </div>
        </div>
        <span className="text-caption shrink-0">6 tháng gần nhất</span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 grid place-items-center text-body-sm text-text-muted">
          Chưa có dữ liệu doanh thu.
        </div>
      ) : (
        <div className="chart-focus-reset h-64">
          <SafeResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-text-muted)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}tr`}
              />
              <Tooltip cursor={{ fill: "var(--color-bg-hover)" }} content={<MonthTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-caption text-text-secondary">{SERIES_LABEL[value] ?? value}</span>
                )}
              />
              <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="cashIn" fill="var(--color-success)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      )}
    </div>
  );
}
