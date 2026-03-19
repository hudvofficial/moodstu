"use client";

import { TrendingUp } from "lucide-react";

const MOCK_DATA = [
  { month: "T10", revenue: 32000000 },
  { month: "T11", revenue: 45000000 },
  { month: "T12", revenue: 38000000 },
  { month: "T1", revenue: 52000000 },
  { month: "T2", revenue: 41000000 },
  { month: "T3", revenue: 45500000 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function RevenueChart() {
  const max = Math.max(...MOCK_DATA.map((d) => d.revenue));

  return (
    <div className="card-base h-full p-5 entrance entrance-3">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-h3">Doanh thu theo tháng</h3>
        </div>
        <span className="text-caption">6 tháng gần nhất</span>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-3 h-[180px]">
        {MOCK_DATA.map((item) => {
          const height = (item.revenue / max) * 100;
          return (
            <div
              key={item.month}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <span className="text-caption opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {formatCurrency(item.revenue)} ₫
              </span>
              <div
                className="w-full rounded-t-lg bg-primary/15 group-hover:bg-primary/30 transition-colors relative"
                style={{ height: `${height}%` }}
              >
                <div
                  className="absolute bottom-0 w-full rounded-t-lg bg-primary/80 transition-all"
                  style={{ height: `${Math.min(height, 100)}%` }}
                />
              </div>
              <span className="text-caption font-medium">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
