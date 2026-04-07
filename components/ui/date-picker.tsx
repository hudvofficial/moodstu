"use client";
/* eslint-disable react/forbid-elements -- DatePicker primitive uses semantic native buttons for calendar matrix */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

import {
  format,
  isToday,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  setMonth,
  setYear,
  isSameMonth,
  isValid,
  getYear,
} from "date-fns";
import { vi } from "date-fns/locale";

// ─── Props ──────────────────────────────────────────────────────
interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  compact?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  label,
  required = false,
  placeholder = "Chọn ngày",
  className = "",
  triggerClassName = "",
  compact = false,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  // HYDRATION FIX: Always start with `true` (server default) to match SSR.
  const [isNarrow, setIsNarrow] = useState(true);

  // Sync isNarrow with actual viewport after mount + resize
  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = !isNarrow;

  const [viewDate, setViewDate] = useState(() =>
    value && isValid(new Date(value)) ? new Date(value) : new Date(),
  );
  const [viewMode, setViewMode] = useState<"day" | "month" | "year">("day");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yearsContainerRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  // ─── Derived state ────────────────────────────────────────
  const selectedDate = useMemo(() => {
    if (value && isValid(new Date(value))) return new Date(value);
    return undefined;
  }, [value]);

  // ─── Scroll to current year ───────────────────────────────
  useEffect(() => {
    if (viewMode === "year" && yearsContainerRef.current) {
      const el = document.getElementById(`year-${getYear(viewDate)}`);
      if (el) el.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [viewMode, viewDate]);

  // ─── Popover position ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const calendarWidth = compact ? 230 : 400;
      const calendarHeight = 340;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = rect.left;
      if (left + calendarWidth > viewportWidth - 16) {
        left = rect.right - calendarWidth;
      }

      let top = rect.bottom + 8;
      if (top + calendarHeight > viewportHeight - 16) {
        top = rect.top - calendarHeight - 8;
      }

      setPopoverPos({
        top,
        left: Math.max(8, left),
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, compact]);

  // ─── Desktop: Click outside to close ──────────────────────
  useEffect(() => {
    if (!isDesktop || !isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        const portalEl = document.getElementById("datepicker-portal");
        if (portalEl && portalEl.contains(e.target as Node)) return;
        setIsOpen(false);
        setViewMode("day");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isDesktop, isOpen]);

  // ─── Desktop: ESC to close ────────────────────────────────
  useEffect(() => {
    if (!isDesktop || !isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setViewMode("day");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isDesktop, isOpen]);

  // ─── Close when another modal requests it ─────────────────
  useEffect(() => {
    const handler = () => {
      setIsOpen(false);
      setViewMode("day");
    };
    window.addEventListener("closeAllDatePickers", handler);
    return () => window.removeEventListener("closeAllDatePickers", handler);
  }, []);

  // ─── Memoised data ────────────────────────────────────────
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const years = useMemo(() => {
    const cur = getYear(new Date());
    const arr: number[] = [];
    for (let i = cur - 100; i <= cur + 20; i++) arr.push(i);
    return arr;
  }, []);

  // ─── Stable callbacks ─────────────────────────────────────
  const handleSelectDay = useCallback(
    (day: Date) => {
      onChange(format(day, "yyyy-MM-dd"));
      setIsOpen(false);
      setViewMode("day");
    },
    [onChange],
  );

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setViewMode("day");
      return !prev;
    });
  }, []);

  const nextMonth = useCallback(() => setViewDate((d) => addMonths(d, 1)), []);
  const prevMonth = useCallback(() => setViewDate((d) => subMonths(d, 1)), []);

  const handleClear = useCallback(() => {
    onChange("");
    setIsOpen(false);
    setViewMode("day");
  }, [onChange]);

  const handleToday = useCallback(() => {
    const today = new Date();
    handleSelectDay(today);
    setViewDate(today);
  }, [handleSelectDay]);

  const iconSize = compact ? 16 : 20;

  // ─── Shared Calendar Panel ────────────────────────────────
  const calendarPanel = (
    <div
      className={`bg-elevated ${
        !isDesktop
          ? "w-full rounded-md p-3"
          : compact
            ? "w-56 shadow-2xl rounded-md p-2.5"
            : "w-full lg:w-82 lg:shadow-2xl rounded-md p-3"
      }`}
    >
      {/* Header */}
      <div
        className={`relative flex items-center justify-between ${compact ? "mb-2 min-h-7" : "mb-2 min-h-xl"}`}
      >
        {viewMode === "day" ? (
          <button
            type="button"
            onClick={prevMonth}
            className={`flex items-center justify-center hover:bg-surface text-text-secondary transition-colors active:scale-90 ${compact ? "w-7 h-7 rounded-full" : "w-11 h-11 rounded-full"}`}
            style={{ border: "1px solid var(--color-border)" }}
          >
            <ChevronLeft size={iconSize} />
          </button>
        ) : (
          <div className={compact ? "w-7" : "w-11"} />
        )}

        <button
          type="button"
          onClick={() =>
            setViewMode(
              viewMode === "day"
                ? "month"
                : viewMode === "month"
                  ? "year"
                  : "day",
            )
          }
          className={`font-semibold text-text-main hover:text-primary transition-colors hover:bg-surface uppercase tracking-tight ${compact ? "text-xs px-3 py-1 rounded-md" : "text-xs px-3 py-1.5 rounded-md"}`}
        >
          {viewMode === "day" && format(viewDate, "MMMM yyyy", { locale: vi })}
          {viewMode === "month" && format(viewDate, "yyyy")}
          {viewMode === "year" && "Chọn năm"}
        </button>

        {viewMode === "day" ? (
          <button
            type="button"
            onClick={nextMonth}
            className={`flex items-center justify-center hover:bg-surface text-text-secondary transition-colors active:scale-90 ${compact ? "w-7 h-7 rounded-full" : "w-11 h-11 rounded-full"}`}
            style={{ border: "1px solid var(--color-border)" }}
          >
            <ChevronRight size={iconSize} />
          </button>
        ) : (
          <div className={compact ? "w-7" : "w-11"} />
        )}
      </div>

      {/* Day View */}
      {viewMode === "day" && (
        <>
          <div className="grid grid-cols-7 text-center mb-1">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
              <div
                key={day}
                className={`font-medium text-text-secondary ${compact ? "text-micro" : "text-tiny"}`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center">
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, viewDate);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  disabled={!isCurrentMonth}
                  className={`
                    flex items-center justify-center transition-colors ${compact ? "w-7 h-7 rounded-full text-xs" : "w-10 h-10 rounded-full text-sm"}
                    ${!isCurrentMonth ? "text-transparent cursor-default" : ""}
                    ${selected ? "bg-primary text-text-inverse font-medium shadow-lg shadow-primary/30" : "hover:bg-surface text-text-main font-normal"}
                    ${today && !selected ? "text-primary font-medium bg-primary/5 border-2 border-primary/30" : ""}
                  `}
                >
                  {isCurrentMonth ? format(day, "d") : ""}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Month View */}
      {viewMode === "month" && (
        <div className={`grid grid-cols-3 ${compact ? "gap-1.5" : "gap-2"}`}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((monthIdx) => (
            <button
              key={monthIdx}
              type="button"
              onClick={() => {
                setViewDate(setMonth(viewDate, monthIdx));
                setViewMode("day");
              }}
              className={`
                font-semibold uppercase tracking-wider transition-colors ${compact ? "p-2 rounded-md text-tiny" : "p-2.5 rounded-md text-micro"}
                ${monthIdx === viewDate.getMonth() ? "bg-primary text-text-inverse shadow-lg shadow-primary/30" : "hover:bg-surface text-text-main"}
              `}
              style={monthIdx !== viewDate.getMonth() ? { border: "1px solid var(--color-border)" } : undefined}
            >
              T{monthIdx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Year View */}
      {viewMode === "year" && (
        <div
          ref={yearsContainerRef}
          className={`overflow-y-auto grid grid-cols-3 pr-1 ${compact ? "h-52 gap-1.5" : "h-64 gap-2"}`}
        >
          {years.map((year) => (
            <button
              key={year}
              type="button"
              id={`year-${year}`}
              onClick={() => {
                setViewDate(setYear(viewDate, year));
                setViewMode("month");
              }}
              className={`
                font-semibold uppercase tracking-wider transition-colors ${compact ? "p-2 rounded-md text-tiny" : "p-2.5 rounded-md text-micro"}
                ${year === viewDate.getFullYear() ? "bg-primary text-text-inverse shadow-lg shadow-primary/30" : "hover:bg-surface text-text-main"}
              `}
              style={year !== viewDate.getFullYear() ? { border: "1px solid var(--color-border)" } : undefined}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        className={`flex justify-between ${compact ? "mt-2 pt-2 gap-2" : "mt-3 pt-2.5 gap-2"}`}
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <button
          type="button"
          onClick={handleClear}
          className={`flex-1 font-medium text-error hover:bg-error/5 transition-colors ${compact ? "px-3 py-1.5 text-micro rounded-md" : "px-3 py-1.5 text-xs rounded-md"}`}
          style={{ border: "1px solid var(--color-error)" }}
        >
          Xóa chọn
        </button>
        <button
          type="button"
          onClick={handleToday}
          className={`flex-1 font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/15 ${compact ? "px-3 py-1.5 text-micro rounded-md" : "px-3 py-1.5 text-xs rounded-md"}`}
        >
          Hôm nay
        </button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="label-base">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          className={`w-full px-3 py-2.5 min-h-11 text-left text-xs leading-4 bg-elevated flex items-center justify-between group transition-colors ${isOpen ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border border-border hover:border-primary/50"} ${triggerClassName}`}
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          <span
            className={
              selectedDate
                ? "text-text-main font-medium"
                : "text-text-muted font-medium"
            }
          >
            {selectedDate
              ? format(selectedDate, "dd/MM/yyyy", { locale: vi })
              : placeholder}
          </span>
          <Calendar className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />
        </button>

        {/* ─── DESKTOP: Portal Popover ─── */}
        {isDesktop &&
          isOpen &&
          createPortal(
            <div
              id="datepicker-portal"
              className="animate-popover-in"
              style={{
                position: "fixed",
                top: popoverPos.top,
                left: popoverPos.left,
                zIndex: 9999,
              }}
            >
              {calendarPanel}
            </div>,
            document.body,
          )}
      </div>

      {/* ─── MOBILE: Bottom Sheet ─── */}
      {!isDesktop &&
        isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/40 animate-backdrop-in"
              style={{ zIndex: 10001 }}
              onClick={() => {
                setIsOpen(false);
                setViewMode("day");
              }}
            />
            <div
              className="fixed bottom-0 left-0 right-0 animate-slide-up"
              style={{ zIndex: 10002 }}
            >
              <div className="bg-elevated rounded-t-lg shadow-2xl pb-[env(safe-area-inset-bottom)] max-h-[85vh] overflow-hidden">
                <div className="flex justify-center pt-2.5 pb-1">
                  <div className="w-10 h-1 bg-border opacity-60 rounded-full" />
                </div>
                <div className="px-4 pb-4">
                  <div className="bg-elevated rounded-md">
                    {calendarPanel}
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
