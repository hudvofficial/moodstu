"use client";

import { memo } from "react";
import { Clock, FileText, MapPin, User } from "lucide-react";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { getCalendarStatusLabel } from "@/lib/utils/calendar-utils";
import { Button } from "@/components/ui/button";

interface CalendarEventCardProps {
  event: UnifiedCalendarEvent;
  onClick?: () => void;
}

const SOURCE_LABELS: Record<UnifiedCalendarEvent["source"], string> = {
  schedule: "Lịch nội bộ",
  task: "Nhiệm vụ",
  google: "Google",
};

function formatTimeRange(event: UnifiedCalendarEvent) {
  if (event.allDay || !event.start.includes("T")) return "Cả ngày";
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;
  const startText = Number.isNaN(start.getTime())
    ? event.start.split("T")[1]?.slice(0, 5) || ""
    : start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const endText = end && !Number.isNaN(end.getTime())
    ? end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : null;
  return endText ? `${startText} - ${endText}` : startText;
}

function CalendarEventCardInner({ event, onClick }: CalendarEventCardProps) {
  const isGoogleEvent = event.source === "google" || !!event.googleEventId;
  const googleStyle = isGoogleEvent
    ? { backgroundColor: event.backgroundColor || "#039be5", color: "#ffffff" }
    : undefined;

  return (
    <Button
      unstyled
      type="button"
      style={googleStyle}
      className={`w-full rounded-lg p-3 text-left shadow-sm transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        !isGoogleEvent ? event.colorToken : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-micro font-bold uppercase tracking-wide ${isGoogleEvent ? "bg-white/20 text-white" : "bg-bg-card/80 text-text-muted"}`}>
              {SOURCE_LABELS[event.source]}
            </span>
            <span className="truncate text-xs opacity-80">{getCalendarStatusLabel(event.status)}</span>
          </div>
          <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">{event.title}</h4>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs opacity-90">
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {formatTimeRange(event)}
        </span>
        {!isGoogleEvent && event.employeeName && (
          <span className="flex min-w-0 items-center gap-1.5">
            <User className="size-3.5 shrink-0" />
            <span className="max-w-36 truncate">{event.employeeName}</span>
          </span>
        )}
        {event.location && (
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            <span className="max-w-36 truncate">{event.location}</span>
          </span>
        )}
      </div>

      {!isGoogleEvent && event.groupLabel && (
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs opacity-80">
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{event.groupLabel}</span>
        </div>
      )}
    </Button>
  );
}

export const CalendarEventCard = memo(CalendarEventCardInner);
