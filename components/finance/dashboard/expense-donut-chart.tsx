"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { formatVnd } from "@/components/finance/finance-format";
import type { ExpenseBreakdownItem } from "@/types/finance-intelligence";

const COLORS = [
  "var(--color-primary)",
  "var(--color-interactive)",
  "var(--color-warning)",
  "var(--color-error)",
  "var(--color-info)",
  "var(--color-success)",
];

interface ExpenseDonutChartProps {
  data: ExpenseBreakdownItem[] | null;
}

export function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="stats-card h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-h3">Cơ Cấu Chi Phí</h3>
        </div>
        <div className="flex-1 w-full min-h-[250px] flex items-center justify-center text-text-secondary">
          Chưa có dữ liệu chi phí.
        </div>
      </div>
    );
  }

  return (
    <div className="stats-card h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-h3">Cơ Cấu Chi Phí</h3>
      </div>
      <div className="chart-focus-reset relative flex-1 w-full min-h-[250px]">
        <SafeResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="total"
              nameKey="category_name"
              cx="50%"
              cy="50%"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
               
              formatter={(value: any) => formatVnd(Number(value))}
              contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
            />
          </PieChart>
        </SafeResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.slice(0, 4).map((item, index) => (
          <div key={item.category_name} className="flex items-center gap-2 text-body-sm">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="truncate">{item.category_name} ({item.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
