"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatVnd } from "@/components/finance/finance-format";
import type { ReceivableAgingResult } from "@/types/finance-intelligence";
import { useMemo } from "react";

interface AgingBarsChartProps {
  data: ReceivableAgingResult | null;
}

export function AgingBarsChart({ data }: AgingBarsChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Trong hạn (0-30đ)', value: data['0_30'].total, count: data['0_30'].count },
      { name: 'Quá hạn (31-60đ)', value: data['31_60'].total, count: data['31_60'].count },
      { name: 'Rủi ro (61-90đ)', value: data['61_90'].total, count: data['61_90'].count },
      { name: 'Nợ xấu (>90đ)', value: data['90_plus'].total, count: data['90_plus'].count },
    ];
  }, [data]);

  const isEmpty = chartData.every(d => d.value === 0);

  if (!data || isEmpty) {
    return (
      <div className="stats-card h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-h3">Chất lượng Công Nợ (Tuổi nợ)</h3>
        </div>
        <div className="flex-1 w-full min-h-[250px] flex items-center justify-center text-text-secondary">
          Chưa có công nợ.
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-h3">Chất lượng Công Nợ (Tuổi nợ)</h3>
      </div>

      <div className="chart-focus-reset flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
            <XAxis type="number" tickFormatter={(val) => `${val / 1000000}M`} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
            <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
            <Tooltip 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any, props: any) => [formatVnd(Number(value)), `Số lượng: ${props.payload.count} HĐ`]}
              contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
            />
            <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
