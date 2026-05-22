"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatVnd } from "@/components/finance/finance-format";
import type { CashflowTimelinePoint, ReportCashflowSummary, ReportPeriodType } from "@/types/reports";

interface ReportsCashflowChartProps {
  data: CashflowTimelinePoint[];
  periodLabel: string;
  periodType: ReportPeriodType;
  summary: ReportCashflowSummary;
}

interface ChartPoint {
  label: string;
  inflow: number;
  outflow: number;
}

interface CashflowTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name?: string;
    value?: number;
  }>;
}

function formatAxisValue(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${Math.round(value / 100_000_000) / 10}ty`;
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 100_000) / 10}tr`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 100) / 10}k`;
  return `${value}`;
}

function buildLabel(date: string, mode: "day" | "month") {
  const [yearText, monthText, dayText] = date.split("-");
  if (mode === "month") return `T${Number(monthText)}/${yearText.slice(2)}`;
  return `${dayText}/${monthText}`;
}

function aggregateTimeline(data: CashflowTimelinePoint[], periodType: ReportPeriodType): ChartPoint[] {
  const mode =
    periodType === "month" || (periodType === "custom" && data.length <= 45)
      ? "day"
      : "month";
  const grouped = new Map<string, ChartPoint>();

  for (const item of data) {
    const key = mode === "month" ? item.date.slice(0, 7) : item.date;
    const current = grouped.get(key) || {
      label: buildLabel(mode === "month" ? `${key}-01` : item.date, mode),
      inflow: 0,
      outflow: 0,
    };
    current.inflow += item.inflow;
    current.outflow += item.outflow;
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
}

function CashflowTooltip({ active, label, payload }: CashflowTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="card-base min-w-44 p-3">
      <p className="text-body-sm font-semibold text-text-primary">{label}</p>
      <div className="mt-2 space-y-1 text-caption text-text-secondary">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-3">
            <span>{entry.name === "inflow" ? "Tiền vào" : "Tiền ra"}</span>
            <span className="tabular-nums font-semibold text-text-primary">
              {formatVnd(Number(entry.value) || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsCashflowChart({
  data,
  periodLabel,
  periodType,
  summary,
}: ReportsCashflowChartProps) {
  const chartData = aggregateTimeline(data, periodType);

  return (
    <div className="card-base h-full p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="icon-box bg-info/10">
              <ReceiptText className="h-4 w-4 text-info" />
            </div>
            <h3 className="text-h3 truncate">Dòng tiền trong kỳ</h3>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            {periodType === "month" || (periodType === "custom" && data.length <= 45)
              ? "Phát sinh theo ngày"
              : "Nhóm theo tháng"}{" "}
            trong {periodLabel}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">
            <span className="inline-flex items-center gap-1">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Vào {formatVnd(summary.totalInflow)}
            </span>
          </Badge>
          <Badge variant="error">
            <span className="inline-flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Ra {formatVnd(summary.totalOutflow)}
            </span>
          </Badge>
          <Badge variant="warning">Lương {formatVnd(summary.salaryCost)}</Badge>
          <Badge variant="neutral">Cố định {formatVnd(summary.fixedCost)}</Badge>
          <Badge variant={summary.netAfterOverhead >= 0 ? "primary" : "error"}>
            Ròng {formatVnd(summary.netAfterOverhead)}
          </Badge>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="grid min-h-[320px] place-items-center text-body-sm text-text-muted">
          Chưa có giao dịch phát sinh trong kỳ này.
        </div>
      ) : (
        <div className="h-80">
          <SafeResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={8}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis stroke="var(--color-text-muted)" tickLine={false} axisLine={false} tickFormatter={formatAxisValue} />
              <Tooltip cursor={false} content={<CashflowTooltip />} />
              <Bar dataKey="inflow" fill="var(--color-success)" radius={[6, 6, 0, 0]} maxBarSize={24} />
              <Bar dataKey="outflow" fill="var(--color-error)" radius={[6, 6, 0, 0]} maxBarSize={24} />
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      )}
    </div>
  );
}
