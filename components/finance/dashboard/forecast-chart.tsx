"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatVnd } from "@/components/finance/finance-format";
import type { CashflowForecastResult } from "@/types/finance-intelligence";

interface ForecastChartProps {
  data: CashflowForecastResult | null;
}

export function ForecastChart({ data }: ForecastChartProps) {
  const chartData = useMemo(() => {
    if (!data || !data.forecast30Days) return [];
    return data.forecast30Days.map(item => ({
      date: item.date.split('-').slice(1).join('/'), // MM/DD
      balance: item.balance,
      in: item.projectedIncome,
      out: item.projectedExpense,
      empty: item.balance === 0 && item.projectedIncome === 0 && item.projectedExpense === 0
    }));
  }, [data]);

  if (!data || data.forecast30Days.length === 0) {
    return (
      <div className="stats-card h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-h3">Dự Trữ Tiền Mặt (30 Ngày)</h3>
        </div>
        <div className="flex-1 w-full min-h-[250px] flex items-center justify-center text-text-secondary">
          Chưa có dữ liệu dự phóng.
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-h3">Dự Trữ Tiền Mặt (30 Ngày)</h3>
        <p className="text-body-sm text-text-secondary">
          Điểm trũng nhất dự kiến: <span className="font-medium text-error">{data.summary.criticalDate ? new Date(data.summary.criticalDate).toLocaleDateString('vi-VN') : 'Không có'}</span>
        </p>
      </div>

      <div className="chart-focus-reset flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} dy={10} minTickGap={20} />
            <YAxis 
              tickFormatter={(val) => {
                if (val === 0) return '0';
                return `${(val / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
              }} 
              width={65}
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            />
            <Tooltip 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatVnd(Number(value))}
              contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
            />
            <Area type="monotone" dataKey="balance" name="Số dư dự kiến" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
