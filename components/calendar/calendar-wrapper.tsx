"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CalendarToolbar } from "./calendar-toolbar";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useCalendarKeyboard } from "@/hooks/use-calendar-keyboard";
import { MonthGrid } from "./views/month-grid";
import { WeekGrid } from "./views/week-grid";
import { DayView } from "./views/day-view";
import { MobileMonthGrid } from "./views/mobile-month-grid";
import { DayDrawer } from "./drawers/day-drawer";
import { EventFormDrawer } from "./drawers/event-form-drawer";
import { FAB } from "@/components/ui/fab";
import { useIsSmallMobile } from "@/hooks/use-mobile";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { Role } from "@/types/roles";

interface CalendarWrapperProps {
  userRole?: string;
  currentUserId?: string;
}

// Skeleton loading component
function CalendarSkeleton() {
  return (
    <div className="w-full h-150 flex flex-col gap-4 p-4 animate-pulse">
      <div className="h-10 w-48 bg-bg-input rounded-md"></div>
      <div className="flex-1 w-full bg-bg-hover rounded-lg"></div>
    </div>
  );
}

export function CalendarWrapper({
  userRole = "viewer",
  currentUserId = "",
}: CalendarWrapperProps) {
  "use no memo"; // Opt out of React Compiler — complex conditional rendering (mounted/viewMode/isSmallScreen) triggers "Rendered more hooks" in production (Sentry 2026-06-09)
  const {
    currentDate,
    setCurrentDate,
    events,
    eventsByDate,
    viewMode,
    setViewMode,
    isLoading,
    error,
    filters,
    mutate,
  } = useCalendarData();
  const [selectedMobileDate, setSelectedMobileDate] = useState<Date | null>(
    null,
  );

  // Swipe navigation for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      // Only navigate if horizontal swipe > 50px and more horizontal than vertical
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        if (deltaX > 0) {
          // Swipe right → previous month
          setCurrentDate(new Date(year, month - 1, 1));
        } else {
          // Swipe left → next month
          setCurrentDate(new Date(year, month + 1, 1));
        }
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [currentDate, setCurrentDate],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UnifiedCalendarEvent | null>(
    null,
  );
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const openCreateForm = (date?: Date) => {
    setEditingEvent(null);
    setDefaultDate(date || new Date());
    setIsFormOpen(true);
  };

  const openEditForm = (event: UnifiedCalendarEvent) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedMobileDate(date);
  };

  const [mounted, setMounted] = useState(false);

  // Tablet (≥640px) cần MonthGrid desktop để hiển thị đủ events/cell.
  // MobileMonthGrid chỉ dùng cho phone portrait thực sự (<640px) — cell hẹp, tap → drawer.
  const isSmallMobile = useIsSmallMobile();

  // §4.4 Keyboard shortcuts: T=Today, M/W/D=ViewMode, ←→=Navigate, C=Create
  useCalendarKeyboard({
    currentDate,
    viewMode,
    onDateChange: setCurrentDate,
    onViewModeChange: setViewMode,
    onCreateEvent: () => openCreateForm(currentDate),
  });

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    
    // Trigger background sync when calendar is opened
    fetch("/api/calendar/sync-worker", { method: "POST" }).catch(() => {});
  }, []);

  const isSmallScreen = isSmallMobile;

  if (error)
    return (
      <div className="p-4 text-red-500">Lỗi tải dữ liệu lịch: {error}</div>
    );

  // Desktop view rendering based on viewMode
  const renderDesktopView = () => {
    switch (viewMode) {
      case "week":
        return (
          <WeekGrid
            currentDate={currentDate}
            eventsByDate={eventsByDate}
            mutate={mutate}
            onEventClick={openEditForm}
            onDateClick={handleDateClick}
          />
        );
      case "day":
        return (
          <DayView
            currentDate={currentDate}
            eventsByDate={eventsByDate}
            onEventClick={openEditForm}
            onCreateEvent={openCreateForm}
          />
        );
      default: // "month"
        return (
          <MonthGrid
            currentDate={currentDate}
            events={events}
            mutate={mutate}
            onEventClick={openEditForm}
            onDateClick={handleDateClick}
          />
        );
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full">
      <CalendarToolbar
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onNewEvent={() => openCreateForm(currentDate)}
      />
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
        {(!mounted || isLoading) && (
          <div className="absolute inset-0 z-20 flex flex-col gap-4 p-4 bg-bg-base/80 backdrop-blur-sm">
            <CalendarSkeleton />
          </div>
        )}

        <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-hidden">
          {mounted && !isSmallScreen && renderDesktopView()}
        </div>

        <div
          className="flex sm:hidden flex-col flex-1 min-h-0 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {mounted && isSmallScreen && (
            <MobileMonthGrid
              currentDate={currentDate}
              events={events}
              onDateSelect={setSelectedMobileDate}
            />
          )}
        </div>
      </div>

      <DayDrawer
        date={selectedMobileDate}
        events={events}
        onClose={() => setSelectedMobileDate(null)}
        onEventClick={openEditForm}
        onCreateEvent={openCreateForm}
      />

      <EventFormDrawer
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        event={editingEvent}
        defaultDate={defaultDate}
        employees={filters.availableEmployees.map((e) => ({
          id: e.value,
          name: e.label,
        }))}
        currentUserId={currentUserId}
        userRole={userRole as Role}
        isGoogleConnected={filters.isGoogleConnected}
        onSuccess={() => {
          mutate();
          fetch("/api/calendar/sync-worker", { method: "POST" }).catch(() => {});
        }}
      />

      <FAB onClick={() => openCreateForm(currentDate)} label="Tạo lịch trình" />
    </div>
  );
}
