"use client";

import { useState, useEffect } from "react";
import { CalendarToolbar } from "./calendar-toolbar";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { MonthGrid } from "./views/month-grid";
import { MobileMonthGrid } from "./views/mobile-month-grid";
import { DayDrawer } from "./drawers/day-drawer";
import { EventFormDrawer } from "./drawers/event-form-drawer";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { Role } from "@/types/roles";

interface CalendarWrapperProps {
  userRole?: string;
  currentUserId?: string;
}

// Skeleton loading component
function CalendarSkeleton() {
  return (
    <div className="w-full h-[600px] flex flex-col gap-4 p-4 animate-pulse">
      <div className="h-10 w-48 bg-slate-200 rounded-md"></div>
      <div className="flex-1 w-full bg-slate-100 rounded-lg"></div>
    </div>
  );
}

export function CalendarWrapper({ userRole = 'viewer', currentUserId = '' }: CalendarWrapperProps) {
  const { currentDate, setCurrentDate, events, isLoading, error, filters, mutate } = useCalendarData();
  const [selectedMobileDate, setSelectedMobileDate] = useState<Date | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UnifiedCalendarEvent | null>(null);
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

  const [mounted, setMounted] = useState(false);
  
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  const isSmallScreen = isMobile || isTablet;

  if (error) return <div className="p-4 text-red-500">Lỗi tải dữ liệu lịch: {error}</div>;

  return (
    <div className="flex flex-col h-full w-full">
      <CalendarToolbar 
        currentDate={currentDate} 
        onDateChange={setCurrentDate} 
        filters={filters} 
        onNewEvent={() => openCreateForm(currentDate)}
      />
      <div className="flex-1 overflow-auto p-4 relative bg-slate-50/30">
         {(!mounted || isLoading) && (
            <div className="absolute inset-0 z-20 flex flex-col gap-4 p-4 bg-slate-50/80 backdrop-blur-sm">
               <CalendarSkeleton />
            </div>
         )}
         
         <div className="hidden lg:block h-full min-h-[600px]">
            {mounted && !isSmallScreen && (
               <MonthGrid 
                  currentDate={currentDate} 
                  events={events} 
                  mutate={mutate} 
                  onEventClick={openEditForm} 
                  onDateClick={openCreateForm}
               />
            )}
         </div>
         
         <div className="block lg:hidden min-h-[400px]">
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
      />

      <EventFormDrawer
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        event={editingEvent}
        defaultDate={defaultDate}
        employees={filters.availableEmployees.map(e => ({ id: e.value, name: e.label }))}
        currentUserId={currentUserId}
        userRole={userRole as Role}
        isGoogleConnected={filters.isGoogleConnected}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
