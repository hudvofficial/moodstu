"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectPill } from "@/components/ui/select";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";
import SolarLunarConverter from "./solar-lunar-converter";
import type { CalendarViewMode } from "@/types/calendar.types";

interface CalendarToolbarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  filters: {
    selectedEmployees: string[];
    setSelectedEmployees: (val: string[]) => void;
    selectedStatuses: string[];
    setSelectedStatuses: (val: string[]) => void;
    selectedSources: string[];
    setSelectedSources: (val: string[]) => void;
    availableEmployees: { label: string; value: string }[];
    availableStatuses: { label: string; value: string }[];
    availableSources: { label: string; value: string }[];
  };
  onNewEvent: () => void;
  onNavigateDate?: (date: Date) => void;
  onOpenLunarDay?: (date: Date) => void;
  isUpdating?: boolean;
}

const VIEW_MODE_OPTIONS: { label: string; value: CalendarViewMode }[] = [
  { label: "Tháng", value: "month" },
  { label: "Tuần", value: "week" },
  { label: "Ngày", value: "day" },
];

function shiftDate(date: Date, viewMode: CalendarViewMode, direction: -1 | 1) {
  const next = new Date(date);
  if (viewMode === "month") {
    return new Date(next.getFullYear(), next.getMonth() + direction, 1);
  }
  next.setDate(next.getDate() + (viewMode === "week" ? 7 * direction : direction));
  return next;
}

export function CalendarToolbar({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  filters,
  onNewEvent,
  onNavigateDate,
  onOpenLunarDay,
  isUpdating = false,
}: CalendarToolbarProps) {
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);

  const hasActiveFilter =
    filters.selectedStatuses.length > 0 ||
    filters.selectedEmployees.length > 0 ||
    filters.selectedSources.length > 0;

  const handlePrev = () => onDateChange(shiftDate(currentDate, viewMode, -1));
  const handleNext = () => onDateChange(shiftDate(currentDate, viewMode, 1));
  const handleToday = () => onDateChange(new Date());

  const sourceFilter = (
    <SelectPill
      value={filters.selectedSources[0] || "all"}
      onChange={(val) => filters.setSelectedSources(val && val !== "all" ? [val] : [])}
      placeholder="Tất cả Nguồn"
      options={[{ label: "Tất cả Nguồn", value: "all" }, ...filters.availableSources]}
    />
  );

  const statusFilter = (
    <SelectPill
      value={filters.selectedStatuses[0] || "all"}
      onChange={(val) => filters.setSelectedStatuses(val && val !== "all" ? [val] : [])}
      placeholder="Tất cả Trạng thái"
      options={[{ label: "Tất cả Trạng thái", value: "all" }, ...filters.availableStatuses]}
    />
  );

  const employeeFilter = (
    <SelectPill
      value={filters.selectedEmployees[0] || "all"}
      onChange={(val) => filters.setSelectedEmployees(val && val !== "all" ? [val] : [])}
      placeholder="Tất cả Nhân sự"
      options={[{ label: "Tất cả Nhân sự", value: "all" }, ...filters.availableEmployees]}
    />
  );

  return (
    <>
      <div className="hidden items-center justify-between gap-3 px-4 py-3 lg:flex">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            unstyled
            type="button"
            onClick={() => setIsMonthYearPickerOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1 text-xl font-bold text-text-primary transition-colors hover:bg-bg-hover hover:text-primary"
            aria-label={`Chọn tháng và năm, hiện tại tháng ${month}, ${year}`}
          >
            <CalendarIcon className="size-5 text-text-muted" />
            Tháng {month}, {year}
          </Button>

          <div className="ml-2 flex items-center overflow-hidden rounded-lg bg-bg-card shadow-sm">
            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-none p-0" onClick={handlePrev} aria-label="Kỳ trước">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" className="h-8 rounded-none px-3 font-medium" onClick={handleToday}>
              Hôm nay
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-none p-0" onClick={handleNext} aria-label="Kỳ sau">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="ml-2 flex items-center overflow-hidden rounded-lg bg-bg-card shadow-sm">
            {VIEW_MODE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={viewMode === opt.value ? "primary" : "ghost"}
                size="sm"
                className="h-8 rounded-none px-3 text-xs font-medium"
                onClick={() => onViewModeChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isUpdating && (
            <div className="hidden items-center gap-1.5 rounded-full bg-bg-hover px-2.5 py-1 text-xs font-medium text-text-muted xl:flex">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              Đang cập nhật
            </div>
          )}
          {sourceFilter}
          {statusFilter}
          {employeeFilter}
          <Button
            variant="ghost"
            onClick={() => setIsConverterOpen(true)}
            className="gap-1.5 text-warning hover:bg-warning/10"
            title="Đổi Âm lịch / Dương lịch"
          >
            <RefreshCcw className="size-4" />
            Âm/Dương
          </Button>
          <Button onClick={onNewEvent} className="ml-2 gap-1.5 whitespace-nowrap font-medium">
            <Plus className="size-4" />
            Tạo lịch
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3 py-2 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0" onClick={handlePrev} aria-label="Kỳ trước">
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              variant="ghost"
              className="rounded-lg px-2 py-1 text-base font-bold"
              onClick={() => setIsMonthYearPickerOpen(true)}
              aria-label={`Chọn tháng và năm, hiện tại tháng ${month}, ${year}`}
            >
              T{month}, {year}
            </Button>
            <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0" onClick={handleNext} aria-label="Kỳ sau">
              <ChevronRight className="size-5" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            {isUpdating && (
              <div className="flex size-10 items-center justify-center rounded-full border border-border/50 bg-bg-card text-primary shadow-sm">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => setShowMobileFilters((value) => !value)}
              className={`relative h-10 w-10 rounded-full border border-border/50 bg-bg-card p-0 shadow-sm ${
                hasActiveFilter || showMobileFilters ? "border-primary/20 bg-primary/10 text-primary" : "text-text-main"
              }`}
              aria-label="Bộ lọc"
            >
              <SlidersHorizontal className="size-6" />
              {hasActiveFilter && <span className="absolute right-0 top-0 size-2 rounded-full bg-primary" />}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsConverterOpen(true)}
              className="h-10 w-10 rounded-full border border-warning/20 bg-bg-card p-0 text-warning shadow-sm hover:bg-warning/10"
              aria-label="Đổi Âm/Dương"
            >
              <RefreshCcw className="size-6" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          <Button variant="ghost" size="sm" onClick={handleToday} className="shrink-0 rounded-full bg-bg-card px-3 py-1.5 text-xs font-medium text-text-muted shadow-sm">
            Hôm nay
          </Button>
          <Button variant="primary" size="sm" className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm">
            Tháng
          </Button>
        </div>

        {showMobileFilters && (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <SelectPill
              value={filters.selectedSources[0] || "all"}
              onChange={(val) => filters.setSelectedSources(val && val !== "all" ? [val] : [])}
              placeholder="Nguồn"
              options={[{ label: "Tất cả", value: "all" }, ...filters.availableSources]}
            />
            <SelectPill
              value={filters.selectedStatuses[0] || "all"}
              onChange={(val) => filters.setSelectedStatuses(val && val !== "all" ? [val] : [])}
              placeholder="Trạng thái"
              options={[{ label: "Tất cả", value: "all" }, ...filters.availableStatuses]}
            />
            <SelectPill
              value={filters.selectedEmployees[0] || "all"}
              onChange={(val) => filters.setSelectedEmployees(val && val !== "all" ? [val] : [])}
              placeholder="Nhân sự"
              options={[{ label: "Tất cả", value: "all" }, ...filters.availableEmployees]}
            />
          </div>
        )}
      </div>

      <SolarLunarConverter
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
        onNavigateDate={onNavigateDate ?? onDateChange}
        onOpenDayDetail={onOpenLunarDay}
      />
      {isMonthYearPickerOpen && (
        <CalendarMonthYearPicker
          open={isMonthYearPickerOpen}
          currentDate={currentDate}
          viewMode={viewMode}
          onOpenChange={setIsMonthYearPickerOpen}
          onSelectDate={onDateChange}
        />
      )}
    </>
  );
}
