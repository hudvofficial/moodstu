"use client";

import { Drawer } from "@/components/ui/drawer";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarEventCard } from "../calendar-event-card";

interface DayDrawerProps {
  date: Date | null;
  events: UnifiedCalendarEvent[];
  onClose: () => void;
  onEventClick?: (event: UnifiedCalendarEvent) => void;
}

export function DayDrawer({ date, events, onClose, onEventClick }: DayDrawerProps) {
  const dateIso = date ? format(date, "yyyy-MM-dd") : "";
  const eventsForDay = date ? events.filter(e => e.start.split("T")[0] === dateIso) : [];
  // Use generic language instead of fixed day
  const formattedTitle = date ? format(date, "EEEE, d 'tháng' M", { locale: vi }) : "";

  return (
    <Drawer
      isOpen={!!date}
      onClose={onClose}
      title={formattedTitle || "Lịch trình"}
    >
      <div className="flex flex-col gap-3 p-4 pb-safe">
        {eventsForDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p>Trống lịch trình ngày này.</p>
          </div>
        ) : (
          eventsForDay.map(ev => (
            <CalendarEventCard 
              key={ev.id} 
              event={ev} 
              onClick={() => onEventClick?.(ev)} 
            />
          ))
        )}
      </div>
    </Drawer>
  );
}
