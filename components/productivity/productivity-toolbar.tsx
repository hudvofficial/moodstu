"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsFilter } from "@/components/ui/tabs-filter";
import type { ProductivityPeriod } from "@/types/productivity";
import { PERIOD_LABELS } from "@/types/productivity-constants";

// ── Error banner for stale data ──
interface ProductivityErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ProductivityErrorBanner({ message, onRetry }: ProductivityErrorBannerProps) {
  return (
    <div className="card-base bg-warning/5 px-4 py-4 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-semibold text-text-main">
            Dữ liệu đang hiển thị có thể chưa mới nhất
          </p>
          <p className="text-body-sm text-text-secondary">{message}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          Tải lại
        </Button>
      </div>
    </div>
  );
}

// ── Period tabs with date range ──
interface ProductivityPeriodControlProps {
  period: ProductivityPeriod;
  dateRange: { start: string; end: string };
  isPending: boolean;
  onChange: (nextPeriod: string) => void;
}

export function ProductivityPeriodControl({
  period,
  dateRange,
  isPending,
  onChange,
}: ProductivityPeriodControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 lg:justify-between">
      <div className="flex flex-col gap-2">
        <TabsFilter
          tabs={(
            ["week", "month", "quarter"] as ProductivityPeriod[]
          ).map((item) => ({
            label: PERIOD_LABELS[item],
            value: item,
          }))}
          activeTab={period}
          onChange={onChange}
        />
        <p className="max-lg:hidden text-caption text-text-muted">
          {dateRange.start} → {dateRange.end}
          {isPending && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Đang cập nhật
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
