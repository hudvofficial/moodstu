"use client";

/**
 * 📋 TransactionFilters — Filter bar for transaction history
 * Clone: inventory-filters.tsx
 */

import { TabsFilter } from "@/components/ui/tabs-filter";
import { SelectPill } from "@/components/ui/select/SelectPill";

const TYPE_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Nhập kho", value: "stock_in" },
  { label: "Xuất kho", value: "stock_out" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "Thời gian" },
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
];

interface TransactionFiltersProps {
  type: string;
  dateRange: string;
  onTypeChange: (type: string) => void;
  onDateRangeChange: (range: string) => void;
}

function getDateRangeValue(from: string, to: string): string {
  if (!from && !to) return "all";
  const today = new Date();
  const fromDate = from ? new Date(from) : null;

  if (fromDate) {
    const diffDays = Math.floor((today.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays <= 7) return "week";
    if (diffDays <= 31) return "month";
  }
  return "all";
}

export function TransactionFilters({
  type,
  dateRange,
  onTypeChange,
  onDateRangeChange,
}: TransactionFiltersProps) {
  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={TYPE_TABS}
          activeTab={type}
          onChange={onTypeChange}
          variant="pills"
        />
        <div className="h-5 border-l border-border shrink-0" />
        <SelectPill
          value={dateRange}
          onChange={onDateRangeChange}
          defaultValue="all"
          placeholder="Thời gian"
          options={DATE_RANGE_OPTIONS}
        />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
        <TabsFilter
          tabs={TYPE_TABS}
          activeTab={type}
          onChange={onTypeChange}
        />
        <div className="flex items-center gap-2">
          <SelectPill
            value={dateRange}
            onChange={onDateRangeChange}
            defaultValue="all"
            placeholder="Thời gian"
            options={DATE_RANGE_OPTIONS}
          />
        </div>
      </div>
    </>
  );
}

export function computeDateRange(rangeKey: string): { from: string; to: string } {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  switch (rangeKey) {
    case "today":
      return { from: todayStr, to: todayStr };
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return { from: weekAgo.toISOString().split("T")[0], to: todayStr };
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return { from: monthAgo.toISOString().split("T")[0], to: todayStr };
    }
    default:
      return { from: "", to: "" };
  }
}
