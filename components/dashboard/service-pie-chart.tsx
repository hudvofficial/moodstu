"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import { formatVnd } from "@/lib/utils";
import type { ServiceBreakdownData } from "@/types/dashboard";

interface ServicePieChartProps {
  data: ServiceBreakdownData[];
  canView: boolean;
  showRevenue: boolean;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border bg-bg-base/50 px-4 text-center text-body-sm text-text-secondary">
      {message}
    </div>
  );
}

export function ServicePieChart({ data, canView, showRevenue }: ServicePieChartProps) {
  const totalPercent = data.reduce((sum, item) => sum + item.value, 0);
  const gradientParts = data.reduce<{ parts: string[]; offset: number }>(
    (acc, item) => {
      const start = acc.offset;
      const end = start + item.value;
      acc.parts.push(`${item.fill} ${start}% ${end}%`);
      return { parts: acc.parts, offset: end };
    },
    { parts: [], offset: 0 },
  ).parts;
  const gradient = gradientParts.length
    ? `conic-gradient(${gradientParts.join(", ")})`
    : "conic-gradient(var(--color-border) 0% 100%)";

  return (
    <div className="card-base h-full p-5 entrance entrance-4">
      <div className="mb-5 flex items-center gap-2">
        <div className="icon-box bg-accent/10">
          <PieChartIcon className="h-4 w-4 text-accent" />
        </div>
        <h3 className="text-h3">Phân bổ dịch vụ</h3>
      </div>

      {!canView ? (
        <EmptyState message="Vai trò hiện tại không có quyền xem dữ liệu hợp đồng." />
      ) : data.length === 0 ? (
        <EmptyState message="Chưa có hợp đồng trong tháng này." />
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <div
              className="h-36 w-36 rounded-full"
              style={{ background: gradient }}
              aria-label="Phân bổ dịch vụ"
            />
            <div className="absolute inset-8 flex items-center justify-center rounded-full bg-bg-card">
              <span className="text-h3">{Math.round(totalPercent)}%</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {data.map((item) => (
              <div key={item.serviceType} className="flex min-w-0 items-center gap-2">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="min-w-0 flex-1 truncate text-body-sm">{item.name}</span>
                <span className="shrink-0 text-label font-bold">
                  {item.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                </span>
                {showRevenue ? (
                  <span className="hidden shrink-0 text-caption text-text-secondary sm:inline">
                    {formatVnd(item.revenue)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
