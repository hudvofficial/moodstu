"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import type { MoodieChartPart as ChartPart } from "@/types/moodie";

const COLORS = {
  primary: "var(--color-primary, #9a6544)",
  positive: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0284c7",
  default: "#64748b",
};

function formatValue(value: unknown, format: ChartPart["series"][number]["value_format"]) {
  if (typeof value !== "number") return String(value ?? "");
  if (format === "currency") return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  if (format === "percent") return `${value.toLocaleString("vi-VN")}%`;
  return value.toLocaleString("vi-VN");
}

export function MoodieChartPart({ part }: { part: ChartPart }) {
  const tooltipFormatter = (value: unknown, name: unknown) => {
    const series = part.series.find((item) => item.key === String(name));
    return [formatValue(value, series?.value_format), series?.label || String(name)];
  };

  return (
    <section className="space-y-2 rounded-xl border border-border/70 bg-white p-3 shadow-xs">
      <div>
        <h4 className="text-sm font-semibold text-text-primary">{part.title}</h4>
        {part.description ? <p className="mt-0.5 text-caption text-text-muted">{part.description}</p> : null}
      </div>
      <div className="h-52 min-w-0 sm:h-60">
        <SafeResponsiveContainer width="100%" height="100%">
          {part.chart === "donut" ? (
            <PieChart>
              <Pie data={part.data} dataKey={part.series[0].key} nameKey={part.x_key} innerRadius={48} outerRadius={78} paddingAngle={2}>
                {part.data.map((_, index) => <Cell key={index} fill={Object.values(COLORS)[index % Object.keys(COLORS).length]} />)}
              </Pie>
              <Tooltip formatter={tooltipFormatter} />
            </PieChart>
          ) : part.chart === "line" || part.chart === "sparkline" ? (
            <LineChart data={part.data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              {part.chart !== "sparkline" ? <CartesianGrid strokeDasharray="3 3" vertical={false} /> : null}
              {part.chart !== "sparkline" ? <XAxis dataKey={part.x_key} tick={{ fontSize: 11 }} /> : null}
              {part.chart !== "sparkline" ? <YAxis tick={{ fontSize: 11 }} /> : null}
              <Tooltip formatter={tooltipFormatter} />
              {part.series.map((series) => <Line key={series.key} type="monotone" dataKey={series.key} name={series.key} stroke={COLORS[series.color_token]} strokeWidth={2} dot={part.chart !== "sparkline"} />)}
            </LineChart>
          ) : part.chart === "area" ? (
            <AreaChart data={part.data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={part.x_key} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipFormatter} />
              {part.series.map((series) => <Area key={series.key} type="monotone" dataKey={series.key} name={series.key} stroke={COLORS[series.color_token]} fill={COLORS[series.color_token]} fillOpacity={0.15} />)}
            </AreaChart>
          ) : (
            <BarChart data={part.data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={part.x_key} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipFormatter} />
              {part.series.map((series) => <Bar key={series.key} dataKey={series.key} name={series.key} fill={COLORS[series.color_token]} stackId={part.chart === "stacked_bar" ? "stack" : undefined} radius={[4, 4, 0, 0]} />)}
            </BarChart>
          )}
        </SafeResponsiveContainer>
      </div>
      {part.insight ? <p className="rounded-lg bg-bg-subtle px-2.5 py-2 text-caption text-text-secondary">{part.insight}</p> : null}
    </section>
  );
}
