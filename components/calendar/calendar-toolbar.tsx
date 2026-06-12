import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  RefreshCcw,
} from "lucide-react";
import { SelectPill } from "@/components/ui/select";
import SolarLunarConverter from "./solar-lunar-converter";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";
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
    availableEmployees: { label: string; value: string }[];
    availableStatuses: { label: string; value: string }[];
  };
  onNewEvent: () => void;
}

const VIEW_MODE_OPTIONS: { label: string; value: CalendarViewMode }[] = [
  { label: "Tháng", value: "month" },
  { label: "Tuần", value: "week" },
  { label: "Ngày", value: "day" },
];

export function CalendarToolbar({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  filters,
  onNewEvent,
}: CalendarToolbarProps) {
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);

  const hasActiveFilter =
    filters.selectedStatuses.length > 0 || filters.selectedEmployees.length > 0;

  const handlePrev = () => {
    if (viewMode === "month") {
      onDateChange(new Date(year, currentDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      onDateChange(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      onDateChange(d);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      onDateChange(new Date(year, currentDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      onDateChange(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      onDateChange(d);
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <>
      {/* ── Desktop Toolbar (≥640px — khớp breakpoint với grid trong calendar-wrapper) ── */}
      <div className="hidden sm:flex flex-col">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsMonthYearPickerOpen(true)}
              className="text-xl font-bold flex items-center gap-2 shrink-0 whitespace-nowrap rounded-lg px-2 py-1 -ml-2 hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Chọn tháng và năm"
            >
              <CalendarIcon className="w-5 h-5 text-text-muted" />
              Tháng {month}, {year}
            </Button>
            <div className="flex items-center ml-2 rounded-lg shadow-sm bg-bg-card overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-none shrink-0"
                style={{ padding: 0 }}
                onClick={handlePrev}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                className="h-8 px-3 rounded-none font-medium whitespace-nowrap"
                onClick={handleToday}
              >
                Hôm nay
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-none shrink-0"
                style={{ padding: 0 }}
                onClick={handleNext}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center rounded-lg shadow-sm bg-bg-card overflow-hidden ml-2">
              {VIEW_MODE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={viewMode === opt.value ? "primary" : "ghost"}
                  size="sm"
                  className="h-8 px-3 rounded-none text-xs font-medium"
                  onClick={() => onViewModeChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Inline filters — ultra-wide (≥1536px) only; at 1280px sidebar+toolbar left side leaves ~912px, inline filters overflow */}
            <div className="hidden 2xl:flex items-center gap-2">
              <SelectPill
                value={filters.selectedStatuses[0] || "all"}
                onChange={(val) =>
                  filters.setSelectedStatuses(val && val !== "all" ? [val] : [])
                }
                placeholder="Tất cả Trạng thái"
                options={[
                  { label: "Tất cả Trạng thái", value: "all" },
                  ...filters.availableStatuses,
                ]}
              />
              <SelectPill
                value={filters.selectedEmployees[0] || "all"}
                onChange={(val) =>
                  filters.setSelectedEmployees(val && val !== "all" ? [val] : [])
                }
                placeholder="Tất cả Nhân sự"
                options={[
                  { label: "Tất cả Nhân sự", value: "all" },
                  ...filters.availableEmployees,
                ]}
              />
            </div>
            {/* Filter toggle — tablet + desktop (<1536px). Wrapper div hides it because .btn overrides 2xl:hidden */}
            <div className="2xl:hidden">
              <Button
                variant="ghost"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className={`w-9 h-9 p-0 rounded-full bg-bg-card shadow-sm border border-border/50 relative ${
                  hasActiveFilter || showMobileFilters
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-text-main"
                }`}
                aria-label="Bộ lọc"
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                {hasActiveFilter && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => setIsConverterOpen(true)}
              className="gap-1.5 text-warning hover:bg-warning/10"
              title="Đổi Âm lịch / Dương lịch"
            >
              <RefreshCcw className="w-4 h-4" />
              <span className="hidden xl:inline">Âm/Dương</span>
            </Button>
            {/* Wrapper div because .btn display:inline-flex overrides hidden */}
            <div className="hidden xl:block">
              <Button
                onClick={onNewEvent}
                className="ml-2 font-medium whitespace-nowrap"
              >
                Tạo lịch trình
              </Button>
            </div>
          </div>
        </div>
        {/* Filter dropdown — tablet + desktop (<1536px) */}
        {showMobileFilters && (
          <div className="2xl:hidden flex items-center gap-2 px-4 pb-3 animate-fade-in">
            <SelectPill
              value={filters.selectedStatuses[0] || "all"}
              onChange={(val) =>
                filters.setSelectedStatuses(val && val !== "all" ? [val] : [])
              }
              placeholder="Trạng thái"
              options={[
                { label: "Tất cả", value: "all" },
                ...filters.availableStatuses,
              ]}
            />
            <SelectPill
              value={filters.selectedEmployees[0] || "all"}
              onChange={(val) =>
                filters.setSelectedEmployees(val && val !== "all" ? [val] : [])
              }
              placeholder="Nhân sự"
              options={[
                { label: "Tất cả", value: "all" },
                ...filters.availableEmployees,
              ]}
            />
          </div>
        )}
      </div>

      {/* ── Mobile Toolbar (<640px) ── */}
      <div className="flex sm:hidden flex-col gap-2 px-2 py-2">
        {/* Row 1: Date nav + Filter icon + CTA icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 rounded-full shrink-0"
              style={{ padding: 0 }}
              onClick={handlePrev}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className="text-base font-bold px-2 py-1 rounded-lg"
              onClick={() => setIsMonthYearPickerOpen(true)}
              aria-label="Chọn tháng và năm"
            >
              T{month}, {year}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 rounded-full shrink-0"
              style={{ padding: 0 }}
              onClick={handleNext}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`w-10 h-10 p-0 rounded-full bg-bg-card shadow-sm border border-border/50 relative ${
                hasActiveFilter || showMobileFilters
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-text-main"
              }`}
              aria-label="Bộ lọc"
            >
              <SlidersHorizontal
                size={26}
                strokeWidth={2.5}
                className="shrink-0"
              />
              {hasActiveFilter && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsConverterOpen(true)}
              className="w-10 h-10 p-0 rounded-full bg-bg-card shadow-sm border border-warning/20 text-warning hover:bg-warning/10"
              aria-label="Đổi Âm/Dương"
            >
              <RefreshCcw size={26} strokeWidth={2.5} className="shrink-0" />
            </Button>
          </div>
        </div>

        {/* Row 2: View mode pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full bg-bg-card shadow-sm text-text-muted"
          >
            Hôm nay
          </Button>
          {VIEW_MODE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={viewMode === opt.value ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange(opt.value)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full ${
                viewMode !== opt.value
                  ? "bg-bg-card shadow-sm text-text-muted"
                  : "shadow-sm"
              }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Mobile filter dropdown (toggleable) */}
        {showMobileFilters && (
          <div className="flex items-center gap-2 py-1 animate-fade-in">
            <SelectPill
              value={filters.selectedStatuses[0] || "all"}
              onChange={(val) =>
                filters.setSelectedStatuses(val && val !== "all" ? [val] : [])
              }
              placeholder="Trạng thái"
              options={[
                { label: "Tất cả", value: "all" },
                ...filters.availableStatuses,
              ]}
            />
            <SelectPill
              value={filters.selectedEmployees[0] || "all"}
              onChange={(val) =>
                filters.setSelectedEmployees(val && val !== "all" ? [val] : [])
              }
              placeholder="Nhân sự"
              options={[
                { label: "Tất cả", value: "all" },
                ...filters.availableEmployees,
              ]}
            />
          </div>
        )}
      </div>
      <SolarLunarConverter
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
        onNavigateDate={onDateChange}
      />
      <CalendarMonthYearPicker
        open={isMonthYearPickerOpen}
        currentDate={currentDate}
        viewMode={viewMode}
        onOpenChange={setIsMonthYearPickerOpen}
        onSelectDate={onDateChange}
      />
    </>
  );
}
