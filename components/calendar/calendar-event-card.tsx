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

  // Only apply hardcoded Google colors for source="google" (external events imported from Google).
  // Mood Studio events synced OUT to Google (source="schedule" | "task" with googleEventId) should
  // keep their native Mood Studio tailwind color tokens.
  const isExternalGoogleEvent = event.source === "google";
  const isSyncedToGoogle = !!event.googleEventId;
  
  const googleStyle = isExternalGoogleEvent
    ? {
        backgroundColor: event.backgroundColor || "#039be5",
        color: "#fff",
      }
    : undefined;

  return (
    <div
      style={googleStyle}
      className={`p-3 rounded-lg shadow-sm flex flex-col gap-2 transition-colors cursor-pointer hover:brightness-95 ${!isExternalGoogleEvent ? event.colorToken : ""}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-semibold text-sm line-clamp-2 leading-tight">
          {event.title}
        </h4>
        {isExternalGoogleEvent ? (
          <span className="shrink-0 text-tiny font-bold bg-white/20 text-white px-1.5 py-0.5 rounded" title="Google Calendar Event">
            G
          </span>
        ) : isSyncedToGoogle ? (
          <span className="shrink-0 text-tiny font-bold opacity-60 px-1 py-0.5" title="Đã đồng bộ lên Google Calendar">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs opacity-90 mt-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeStr}</span>
        </div>

        {!isExternalGoogleEvent && event.employeeName && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span className="truncate max-w-30">{event.employeeName}</span>
          </div>
        )}
      </div>

      {!isExternalGoogleEvent && event.groupLabel && (
        <div className="flex items-center gap-1.5 text-xs opacity-80">
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{event.groupLabel}</span>
        </div>
      )}
    </div>
  );
}

export const CalendarEventCard = memo(CalendarEventCardInner);
