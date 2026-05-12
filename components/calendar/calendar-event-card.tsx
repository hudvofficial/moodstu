"use client";

import { memo } from "react";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { format } from "date-fns";
import { Clock, User, FileText } from "lucide-react";

interface CalendarEventCardProps {
  event: UnifiedCalendarEvent;
  onClick?: () => void;
}

function CalendarEventCardInner({ event, onClick }: CalendarEventCardProps) {
  // Try to parse out the time if available
  const hasTime = event.start.includes("T");
  const timeStr = hasTime ? format(new Date(event.start), "HH:mm") : "Cả ngày";

  const isGoogleEvent = event.source === "google" || !!event.googleEventId;
  const googleStyle = isGoogleEvent
    ? {
        backgroundColor: event.backgroundColor || "#039be5",
        color: "#ffffff",
      }
    : undefined;

  return (
    <div
      style={googleStyle}
      className={`p-3 rounded-lg shadow-sm flex flex-col gap-2 transition-colors cursor-pointer hover:brightness-95 ${!isGoogleEvent ? event.colorToken : ""}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-semibold text-sm line-clamp-2 leading-tight">
          {event.title}
        </h4>
        {isGoogleEvent && (
          <span className="shrink-0 text-tiny font-bold bg-white/20 text-white px-1.5 py-0.5 rounded">
            G
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs opacity-90 mt-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeStr}</span>
        </div>

        {!isGoogleEvent && event.employeeName && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span className="truncate max-w-30">{event.employeeName}</span>
          </div>
        )}
      </div>

      {!isGoogleEvent && event.groupLabel && (
        <div className="flex items-center gap-1.5 text-xs opacity-80">
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{event.groupLabel}</span>
        </div>
      )}
    </div>
  );
}

export const CalendarEventCard = memo(CalendarEventCardInner);
