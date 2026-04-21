"use client";

import DatePicker from "@/components/ui/date-picker";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { TabsFilter } from "@/components/ui/tabs-filter";
import type { ReportFiltersInput, ReportPeriodType, ReportView } from "@/types/reports";

interface FilterOption {
  value: string;
  label: string;
}

interface ReportsFiltersProps {
  filters: ReportFiltersInput;
  view: ReportView;
  showPeriodControls?: boolean;
  monthOptions: FilterOption[];
  yearOptions: FilterOption[];
  onMonthChange: (value: string) => void;
  onQuarterChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onPeriodTypeChange: (value: ReportPeriodType) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onViewChange: (value: ReportView) => void;
}

const VIEW_TABS = [
  { value: "overview", label: "Tổng quan" },
  { value: "cashflow", label: "Dòng tiền" },
  { value: "debts", label: "Công nợ" },
  { value: "profit", label: "Lợi nhuận" },
] satisfies Array<{ value: ReportView; label: string }>;

const PERIOD_OPTIONS = [
  { value: "month", label: "Theo tháng" },
  { value: "quarter", label: "Theo quý" },
  { value: "year", label: "Theo năm" },
  { value: "custom", label: "Tùy chọn" },
] satisfies Array<{ value: ReportPeriodType; label: string }>;

const QUARTER_OPTIONS = [
  { value: "1", label: "Quý 1" },
  { value: "2", label: "Quý 2" },
  { value: "3", label: "Quý 3" },
  { value: "4", label: "Quý 4" },
];

export function ReportsFilters({
  filters,
  view,
  showPeriodControls = true,
  monthOptions,
  yearOptions,
  onMonthChange,
  onQuarterChange,
  onYearChange,
  onPeriodTypeChange,
  onStartDateChange,
  onEndDateChange,
  onViewChange,
}: ReportsFiltersProps) {
  const periodControl = (
    <SelectPill
      value={filters.periodType}
      onChange={(value) => onPeriodTypeChange(value as ReportPeriodType)}
      options={PERIOD_OPTIONS}
      placeholder="Loại kỳ"
      defaultValue="all"
    />
  );

  const desktopRangeControls = (
    <>
      {filters.periodType === "month" && (
        <>
          <SelectPill value={String(filters.month || 1)} onChange={onMonthChange} options={monthOptions} placeholder="Tháng" />
          <SelectPill value={String(filters.year)} onChange={onYearChange} options={yearOptions} placeholder="Năm" />
        </>
      )}

      {filters.periodType === "quarter" && (
        <>
          <SelectPill
            value={String(filters.quarter || 1)}
            onChange={onQuarterChange}
            options={QUARTER_OPTIONS}
            placeholder="Quý"
          />
          <SelectPill value={String(filters.year)} onChange={onYearChange} options={yearOptions} placeholder="Năm" />
        </>
      )}

      {filters.periodType === "year" && (
        <SelectPill value={String(filters.year)} onChange={onYearChange} options={yearOptions} placeholder="Năm" />
      )}

      {filters.periodType === "custom" && (
        <>
          <DatePicker
            value={filters.startDate}
            onChange={onStartDateChange}
            placeholder="Từ ngày"
            className="w-full lg:w-40"
          />
          <DatePicker
            value={filters.endDate}
            onChange={onEndDateChange}
            placeholder="Đến ngày"
            className="w-full lg:w-40"
          />
        </>
      )}
    </>
  );

  const mobileInlineControls = (
    <>
      {filters.periodType === "month" && (
        <>
          <SelectPill value={String(filters.month || 1)} onChange={onMonthChange} options={monthOptions} placeholder="Tháng" />
          <SelectPill value={String(filters.year)} onChange={onYearChange} options={yearOptions} placeholder="Năm" />
        </>
      )}

      {filters.periodType === "quarter" && (
        <>
          <SelectPill
            value={String(filters.quarter || 1)}
            onChange={onQuarterChange}
            options={QUARTER_OPTIONS}
            placeholder="Quý"
          />
          <SelectPill value={String(filters.year)} onChange={onYearChange} options={yearOptions} placeholder="Năm" />
        </>
      )}

      {filters.periodType === "year" && (
        <SelectPill value={String(filters.year)} onChange={onYearChange} options={yearOptions} placeholder="Năm" />
      )}
    </>
  );

  return (
    <>
      <div className="space-y-3 lg:hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <TabsFilter
            tabs={VIEW_TABS}
            activeTab={view}
            onChange={(value) => onViewChange(value as ReportView)}
            variant="pills"
          />
        </div>

        {showPeriodControls ? (
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
            {periodControl}
            {mobileInlineControls}
          </div>
        ) : null}

        {showPeriodControls && filters.periodType === "custom" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DatePicker
              value={filters.startDate}
              onChange={onStartDateChange}
              placeholder="Từ ngày"
              className="w-full"
            />
            <DatePicker
              value={filters.endDate}
              onChange={onEndDateChange}
              placeholder="Đến ngày"
              className="w-full"
            />
          </div>
        )}
      </div>

      <div className="hidden gap-3 lg:flex lg:items-center lg:justify-between">
        <TabsFilter tabs={VIEW_TABS} activeTab={view} onChange={(value) => onViewChange(value as ReportView)} />
        {showPeriodControls ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {periodControl}
            {desktopRangeControls}
          </div>
        ) : null}
      </div>
    </>
  );
}
