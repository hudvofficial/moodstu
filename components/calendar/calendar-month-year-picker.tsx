"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { CalendarViewMode } from "@/types/calendar.types";

interface CalendarMonthYearPickerProps {
  open: boolean;
  currentDate: Date;
  viewMode: CalendarViewMode;
  onOpenChange: (open: boolean) => void;
  onSelectDate: (date: Date) => void;
}

type PickerMode = "month" | "year";

const MONTHS = Array.from({ length: 12 }, (_, index) => index);

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildDateForMonthYear(
  currentDate: Date,
  year: number,
  monthIndex: number,
  viewMode: CalendarViewMode,
) {
  if (viewMode === "month") {
    return new Date(year, monthIndex, 1);
  }

  const clampedDay = Math.min(currentDate.getDate(), getDaysInMonth(year, monthIndex));
  return new Date(year, monthIndex, clampedDay);
}

export function CalendarMonthYearPicker({
  open,
  currentDate,
  viewMode,
  onOpenChange,
  onSelectDate,
}: CalendarMonthYearPickerProps) {
  const [pickerMode, setPickerMode] = useState<PickerMode>("month");
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const today = useMemo(() => new Date(), []);

  const yearOptions = useMemo(() => {
    const start = pickerYear - 5;
    return Array.from({ length: 12 }, (_, index) => start + index);
  }, [pickerYear]);

  const handleSelectMonth = (monthIndex: number) => {
    onSelectDate(buildDateForMonthYear(currentDate, pickerYear, monthIndex, viewMode));
    onOpenChange(false);
  };

  const handleToday = () => {
    onSelectDate(new Date());
    onOpenChange(false);
  };

  const handleStepBack = () => {
    setPickerYear((year) => year - (pickerMode === "month" ? 1 : 12));
  };

  const handleStepForward = () => {
    setPickerYear((year) => year + (pickerMode === "month" ? 1 : 12));
  };

  return (
    <UnifiedModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Chọn tháng"
      description="Nhảy nhanh tới tháng và năm cần xem"
      size="sm"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Button
            unstyled
            type="button"
            onClick={handleStepBack}
            className="icon-btn"
            aria-label={pickerMode === "month" ? "Năm trước" : "12 năm trước"}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setPickerMode((mode) => (mode === "month" ? "year" : "month"))}
            className="min-w-24 justify-center font-bold text-primary"
            aria-label="Đổi chế độ chọn năm"
          >
            {pickerMode === "month" ? pickerYear : `${yearOptions[0]} - ${yearOptions[yearOptions.length - 1]}`}
          </Button>

          <Button
            unstyled
            type="button"
            onClick={handleStepForward}
            className="icon-btn"
            aria-label={pickerMode === "month" ? "Năm sau" : "12 năm sau"}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {pickerMode === "month" ? (
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((monthIndex) => {
              const isSelected =
                currentDate.getFullYear() === pickerYear && currentDate.getMonth() === monthIndex;
              const isCurrentMonth =
                today.getFullYear() === pickerYear && today.getMonth() === monthIndex;

              return (
                <Button
                  key={monthIndex}
                  type="button"
                  variant={isSelected ? "primary" : "outline"}
                  onClick={() => handleSelectMonth(monthIndex)}
                  className={`h-11 justify-center text-sm font-bold ${
                    !isSelected && isCurrentMonth ? "border-primary text-primary bg-primary/10" : ""
                  }`}
                  aria-label={`Chọn tháng ${monthIndex + 1}, ${pickerYear}`}
                >
                  T{monthIndex + 1}
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {yearOptions.map((year) => {
              const isSelectedYear = year === pickerYear;
              const isCurrentYear = year === today.getFullYear();

              return (
                <Button
                  key={year}
                  type="button"
                  variant={isSelectedYear ? "primary" : "outline"}
                  onClick={() => {
                    setPickerYear(year);
                    setPickerMode("month");
                  }}
                  className={`h-11 justify-center text-sm font-bold ${
                    !isSelectedYear && isCurrentYear ? "border-primary text-primary bg-primary/10" : ""
                  }`}
                  aria-label={`Chọn năm ${year}`}
                >
                  {year}
                </Button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 justify-center"
          >
            Đóng
          </Button>
          <Button type="button" variant="secondary" onClick={handleToday} className="flex-1 justify-center gap-2">
            <CalendarDays className="size-4" />
            Hôm nay
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}
