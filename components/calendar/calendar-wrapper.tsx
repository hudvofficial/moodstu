"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { CalendarToolbar } from "./calendar-toolbar";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { useCalendarKeyboard } from "@/hooks/use-calendar-keyboard";
import { DayView } from "./views/day-view";
import { MobileMonthGrid } from "./views/mobile-month-grid";
import { DayDrawer } from "./drawers/day-drawer";
import { LunarDayDrawer } from "./lunar-day-drawer";
import { FAB } from "@/components/ui/fab";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { Role } from "@/types/roles";

const MonthGrid = dynamic(() => import("./views/month-grid").then((mod) => mod.MonthGrid), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-bg-hover" />,
});

const WeekGrid = dynamic(() => import("./views/week-grid").then((mod) => mod.WeekGrid), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-bg-hover" />,
});

const EventFormDrawer = dynamic(() => import("./drawers/event-form-drawer").then((mod) => mod.EventFormDrawer), {
  ssr: false,
  loading: () => null,
});

interface CalendarWrapperProps {
  userRole?: string;
  currentUserId?: string;
}

// Skeleton loading component
function CalendarSkeleton() {
  return (
    <div className="w-full flex-1 min-h-0 flex flex-col animate-pulse">
      <div className="grid grid-cols-7 bg-bg-input border-b border-border shrink-0">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-8 border-r border-border/60 last:border-r-0" />
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 min-h-0">
        {Array.from({ length: 42 }).map((_, index) => (
          <div key={index} className="border-r border-b border-border/60 bg-bg-card last:border-r-0">
            <div className="m-2 h-4 w-8 rounded bg-bg-hover" />
            <div className="mx-2 mt-3 h-3 w-3/4 rounded bg-bg-hover/80" />
            <div className="mx-2 mt-2 h-3 w-1/2 rounded bg-bg-hover/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

const SCROLL_DEBOUNCE_MS = 300;

function removeLunarDrawerParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("drawer")) return;
  url.searchParams.delete("drawer");
  window.history.replaceState({}, "", url.toString());
}

export function CalendarWrapper({ userRole = 'viewer', currentUserId = '' }: CalendarWrapperProps) {
  const { currentDate, setCurrentDate, events, eventsByDate, viewMode, setViewMode, isInitialLoading, isRefreshing, error, filters, mutate } = useCalendarData();
  const [selectedMobileDate, setSelectedMobileDate] = useState<Date | null>(null);
  const [selectedLunarDate, setSelectedLunarDate] = useState<Date | null>(null);

  // Slide animation direction for month transitions
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedInitialLunarDrawerRef = useRef(false);

  // Auto-clear slideDirection after animation completes (250ms matches CSS duration)
  useEffect(() => {
    if (slideDirection) {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      slideTimerRef.current = setTimeout(() => setSlideDirection(null), 250);
    }
    return () => { if (slideTimerRef.current) clearTimeout(slideTimerRef.current); };
  }, [slideDirection]);

  // Desktop: scroll wheel → navigate month (debounce 300ms)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (viewMode !== 'month') return;
    e.preventDefault();
    if (scrollTimeoutRef.current) return; // debounce
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
    }, SCROLL_DEBOUNCE_MS);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    if (e.deltaY > 0) {
      setSlideDirection('left');
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (e.deltaY < 0) {
      setSlideDirection('right');
      setCurrentDate(new Date(year, month - 1, 1));
    }
  }, [currentDate, setCurrentDate, viewMode]);

  // Cleanup refs on unmount
  useEffect(() => {
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Swipe navigation for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Only navigate if horizontal swipe > 50px and more horizontal than vertical
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (deltaX > 0) {
        // Swipe right → previous month
        setSlideDirection('right');
        setCurrentDate(new Date(year, month - 1, 1));
      } else {
        // Swipe left → next month
        setSlideDirection('left');
        setCurrentDate(new Date(year, month + 1, 1));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [currentDate, setCurrentDate]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UnifiedCalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const openCreateForm = useCallback((date?: Date) => {
    setEditingEvent(null);
    setDefaultDate(date || new Date());
    setIsFormOpen(true);
  }, []);
  
  const openEditForm = useCallback((event: UnifiedCalendarEvent) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedMobileDate(date);
  }, []);

  const handleCloseDayDrawer = useCallback(() => {
    setSelectedMobileDate(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleNewEvent = useCallback(() => {
    openCreateForm(currentDate);
  }, [currentDate, openCreateForm]);

  const [mounted, setMounted] = useState(false);
  
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // §4.4 Keyboard shortcuts: T=Today, M/W/D=ViewMode, ←→=Navigate, C=Create
  useCalendarKeyboard({
    currentDate,
    viewMode,
    onDateChange: setCurrentDate,
    onViewModeChange: setViewMode,
    onCreateEvent: handleNewEvent,
  });
  
  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  const isSmallScreen = isMobile || isTablet;

  const handleNavigateDate = useCallback((date: Date) => {
    setCurrentDate(date);
    if (isSmallScreen) {
      setSelectedMobileDate(date);
    } else {
      setViewMode("day");
    }
  }, [isSmallScreen, setCurrentDate, setViewMode]);

  const handleOpenLunarDay = useCallback((date: Date) => {
    setSelectedLunarDate(date);
  }, []);

  const handleCloseLunarDay = useCallback(() => {
    setSelectedLunarDate(null);
    removeLunarDrawerParam();
  }, []);

  const handleCreateFromLunarDay = useCallback((date: Date) => {
    setSelectedLunarDate(null);
    removeLunarDrawerParam();
    openCreateForm(date);
  }, [openCreateForm]);

  const handleGoToCalendarFromLunarDay = useCallback((date: Date) => {
    setSelectedLunarDate(null);
    removeLunarDrawerParam();
    handleNavigateDate(date);
  }, [handleNavigateDate]);

  useEffect(() => {
    if (mounted && isSmallScreen && viewMode !== "month") {
      setViewMode("month");
    }
  }, [mounted, isSmallScreen, setViewMode, viewMode]);

  useEffect(() => {
    if (!mounted || openedInitialLunarDrawerRef.current || typeof window === "undefined") return;
    const params = new URL(window.location.href).searchParams;
    if (params.get("drawer") !== "lunar") return;
    openedInitialLunarDrawerRef.current = true;
    const rafId = window.requestAnimationFrame(() => {
      setSelectedLunarDate(currentDate);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [currentDate, mounted]);

  if (error) return <div className="p-4 text-red-500">Lỗi tải dữ liệu lịch: {error}</div>;

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
            eventsByDate={eventsByDate}
            mutate={mutate}
            onEventClick={openEditForm}
            onDateClick={handleDateClick}
            slideDirection={slideDirection}
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
        onNewEvent={handleNewEvent}
        onNavigateDate={handleNavigateDate}
        onOpenLunarDay={handleOpenLunarDay}
        isUpdating={isInitialLoading || isRefreshing}
      />
      {(isInitialLoading || isRefreshing) && mounted && (
         <div className="h-0.5 w-full overflow-hidden bg-bg-hover">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/70" />
         </div>
      )}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
         {!mounted && (
            <div className="absolute inset-0 z-20 flex flex-col bg-bg-base">
               <CalendarSkeleton />
            </div>
         )}
         
         <div className="hidden lg:flex flex-col flex-1 min-h-0 overflow-hidden" onWheel={handleWheel}>
            {mounted && !isSmallScreen && renderDesktopView()}
         </div>
         
         <div
            className="flex lg:hidden flex-col flex-1 min-h-0 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
         >
            {mounted && isSmallScreen && (
               <MobileMonthGrid 
                  currentDate={currentDate} 
                  eventsByDate={eventsByDate}
                  onDateSelect={setSelectedMobileDate} 
               />
            )}
         </div>
      </div>
      
      <DayDrawer 
         date={selectedMobileDate} 
         events={events} 
         onClose={handleCloseDayDrawer}
         onEventClick={openEditForm}
         onCreateEvent={openCreateForm}
      />

      <LunarDayDrawer
         date={selectedLunarDate}
         onClose={handleCloseLunarDay}
         onCreateEvent={handleCreateFromLunarDay}
         onGoToCalendar={handleGoToCalendarFromLunarDay}
      />

      {isFormOpen && (
        <EventFormDrawer
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          event={editingEvent}
          defaultDate={defaultDate}
          employees={filters.availableEmployees.map(e => ({ id: e.value, name: e.label }))}
          currentUserId={currentUserId}
          userRole={userRole as Role}
          isGoogleConnected={filters.isGoogleConnected}
          onSuccess={handleFormSuccess}
        />
      )}
      
      <FAB onClick={handleNewEvent} label="Tạo lịch trình" />
    </div>
  );
}
