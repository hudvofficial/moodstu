"use client";

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
  const max = Math.max(1, ...data.map((item) => item.revenue));

  return (
    <div className="card-base h-full p-5 entrance entrance-3">
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
        <div className="flex h-44 gap-3">
          {data.map((item) => {
            const height = Math.max(4, (item.revenue / max) * 100);
            return (
              <div
                key={item.month}
                className="group relative flex flex-1 flex-col items-center justify-end"
              >
                <span className="absolute -top-6 z-10 whitespace-nowrap text-caption opacity-0 transition-opacity group-hover:opacity-100">
                  {formatVnd(item.revenue)}
                </span>

                <div className="relative flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-primary opacity-45 transition-all duration-300"
                    style={{ height: `${height}%` }}
                  />
                </div>

                <span className="mt-2 text-caption font-medium">{item.month}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
