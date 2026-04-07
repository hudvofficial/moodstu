"use client";

import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarEventCard } from "../calendar-event-card";
import { Plus, FileText, X } from "lucide-react";

interface DayDrawerProps {
  date: Date | null;
  events: UnifiedCalendarEvent[];
  onClose: () => void;
  onEventClick?: (event: UnifiedCalendarEvent) => void;
  onCreateEvent?: (date: Date) => void;
}

export function DayDrawer({ date, events, onClose, onEventClick, onCreateEvent }: DayDrawerProps) {
  const dateIso = date ? format(date, "yyyy-MM-dd") : "";
  const eventsForDay = date ? events.filter(e => e.start.split("T")[0] === dateIso) : [];
  const dayName = date ? format(date, "EEEE", { locale: vi }) : "";
  const formattedDate = date ? format(date, "dd/MM/yyyy") : "";
  const eventCount = eventsForDay.length;

  return (
    <Drawer
      isOpen={!!date}
      onClose={onClose}
      title={`${dayName}, ${formattedDate} — ${eventCount} sự kiện`}
    >
      <div className="flex flex-col gap-3 p-4 pb-safe">
        {eventCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
            <div className="w-12 h-12 rounded-full bg-bg-input flex items-center justify-center">
              <FileText className="w-5 h-5 text-text-muted" />
            </div>
            <p className="text-sm">Không có lịch trình ngày này</p>
            {date && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onCreateEvent?.(date)}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Thêm lịch
              </Button>
            )}
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

      {/* V1-exact: 3 FAB buttons at bottom */}
      {date && eventCount > 0 && (
        <div className="flex items-center justify-center gap-3 p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/contracts/create?date=${dateIso}`, "_blank")}
            title="Tạo hợp đồng"
            className="flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            HĐ
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onCreateEvent?.(date)}
            title="Thêm lịch mới"
            className="rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-soft"
          >
            <Plus className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Đóng"
            className="rounded-full w-8 h-8 p-0 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Drawer>
  );
}
