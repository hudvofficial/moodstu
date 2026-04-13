"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatVnd } from "@/components/finance/finance-format";
import type { ExpenseBreakdownItem } from "@/types/finance-intelligence";

const COLORS = ["#8B5E3C", "#A57652", "#BC8D68", "#D4A37D", "#EBD6C5", "#9B9B9B"];

interface ExpenseDonutChartProps {
  data: ExpenseBreakdownItem[] | null;
}

export function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-text-secondary stats-card">Chưa có dữ liệu chi phí.</div>;
  }

  return (
    <div className="stats-card h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-h3">Cơ Cấu Chi Phí</h3>
      </div>
      <div className="flex-1 w-full min-h-[250px] relative">
        <ResponsiveContainer width="100%" height="100%">
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatVnd(Number(value))}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
            />
          </PieChart>
        </ResponsiveContainer>
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
