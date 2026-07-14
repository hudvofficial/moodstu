import { type UnifiedCalendarEvent } from "@/types/calendar.types";
import { addDays, differenceInCalendarDays, format as formatFns, parseISO } from "date-fns";

export function getEventColorToken(
  source: UnifiedCalendarEvent["source"],
  workTypeOrStatus?: string | null,
): string {
  if (source === "google") {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }

  if (source === "contract_event") {
    return workTypeOrStatus === "ngay_to_chuc"
      ? "bg-rose-50 text-rose-900 border-rose-200"
      : "bg-violet-50 text-violet-900 border-violet-200";
  }

  if (source === "task") {
    switch (workTypeOrStatus) {
      case "makeup":
        return "bg-pink-50 text-pink-900 border-pink-200";
      case "chup_anh":
        return "bg-indigo-50 text-indigo-900 border-indigo-200";
      case "quay_video":
      case "chinh_sua_video":
        return "bg-sky-50 text-sky-900 border-sky-200";
      case "photoshop":
        return "bg-purple-50 text-purple-900 border-purple-200";
      case "in_an":
        return "bg-emerald-50 text-emerald-900 border-emerald-200";
      default:
        return "bg-blue-50 text-blue-900 border-blue-200";
    }
  }

  return "bg-slate-50 text-slate-900 border-slate-200";
}

export function generateCalendarGroupKey(
  contractId: string | null | undefined,
  dateIsoStr: string,
): string | null {
  if (!contractId) return null;
  const datePart = dateIsoStr.split("T")[0] || dateIsoStr;
  return `${contractId}_${datePart}`;
}

export const CALENDAR_STATUS_LABELS: Record<string, string> = {
  chua_lam: "Chưa làm",
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
  scheduled: "Đã lên lịch",
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
  published: "Google Calendar",
  google: "Google Calendar",
};

export const CALENDAR_STATUS_ORDER = [
  "chua_lam",
  "dang_lam",
  "hoan_thanh",
  "scheduled",
  "confirmed",
  "pending",
  "published",
  "da_huy",
  "cancelled",
] as const;

export function getCalendarStatusLabel(status: string | null | undefined): string {
  if (!status) return "Không rõ";

  const key = status.trim();
  const lowerKey = key.toLowerCase();
  const mapped = CALENDAR_STATUS_LABELS[key] || CALENDAR_STATUS_LABELS[lowerKey];
  if (mapped) return mapped;

  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type EventSpanPosition = "single" | "start" | "middle" | "end";

export interface GridSlot {
  event: UnifiedCalendarEvent | null;
  isAbsolute?: boolean;
  spanDays?: number;
  continuesPrior?: boolean;
  continuesNext?: boolean;
}

export interface WeekEventSegment {
  event: UnifiedCalendarEvent;
  startCol: number;
  endCol: number;
  spanDays: number;
  lane: number;
  continuesPrior: boolean;
  continuesNext: boolean;
}

function getInclusiveEventRange(event: UnifiedCalendarEvent) {
  const startIso = event.start.split("T")[0];
  let endIso = startIso;

  if (event.end) {
    if (event.source === "google" && event.allDay) {
      endIso = formatFns(addDays(parseISO(event.end.split("T")[0]), -1), "yyyy-MM-dd");
    } else if (event.source !== "google" && !event.end.includes("T")) {
      // Internal date-only events are exclusive in DB, make them inclusive for UI rendering
      endIso = formatFns(addDays(parseISO(event.end.split("T")[0]), -1), "yyyy-MM-dd");
    } else {
      endIso = event.end.split("T")[0];
    }
  }

  return {
    startIso,
    endIso: endIso < startIso ? startIso : endIso,
  };
}

export function eventOccursOnDate(event: UnifiedCalendarEvent, dateIso: string) {
  const { startIso, endIso } = getInclusiveEventRange(event);
  return startIso <= dateIso && endIso >= dateIso;
}

export function buildWeekEventSegments(
  events: UnifiedCalendarEvent[],
  weekStartDate: Date,
  weekEndDate: Date,
): WeekEventSegment[] {
  const weekStartIso = formatFns(weekStartDate, "yyyy-MM-dd");
  const weekEndIso = formatFns(weekEndDate, "yyyy-MM-dd");

  const segments = events
    .map((event) => {
      const { startIso, endIso } = getInclusiveEventRange(event);
      if (endIso < weekStartIso || startIso > weekEndIso) return null;

      const renderStartIso = startIso < weekStartIso ? weekStartIso : startIso;
      const renderEndIso = endIso > weekEndIso ? weekEndIso : endIso;
      const startCol = differenceInCalendarDays(parseISO(renderStartIso), weekStartDate);
      const endCol = differenceInCalendarDays(parseISO(renderEndIso), weekStartDate);

      return {
        event,
        startCol,
        endCol,
        spanDays: endCol - startCol + 1,
        lane: -1,
        continuesPrior: startIso < renderStartIso,
        continuesNext: endIso > renderEndIso,
      };
    })
    .filter((segment): segment is WeekEventSegment => Boolean(segment))
    .sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      if (b.spanDays !== a.spanDays) return b.spanDays - a.spanDays;
      return a.event.title.localeCompare(b.event.title);
    });

  const lanes: boolean[][] = [];

  return segments.map((segment) => {
    let lane = 0;

    while (true) {
      const occupied = lanes[lane] ?? Array(7).fill(false);
      let isAvailable = true;

      for (let col = segment.startCol; col <= segment.endCol; col++) {
        if (occupied[col]) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        lanes[lane] = occupied;
        for (let col = segment.startCol; col <= segment.endCol; col++) {
          lanes[lane][col] = true;
        }
        return { ...segment, lane };
      }

      lane++;
    }
  });
}

export function buildGridSlots(
  events: UnifiedCalendarEvent[],
  viewStartDate: Date,
  viewEndDate: Date
): Record<string, GridSlot[]> {
  const result: Record<string, GridSlot[]> = {};

  // Khởi tạo mảng rỗng cho mỗi ngày trong view
  const d = new Date(viewStartDate);
  while (d <= viewEndDate) {
    const iso = formatFns(d, "yyyy-MM-dd");
    result[iso] = [];
    d.setDate(d.getDate() + 1);
  }

  // Tiền xử lý events: Tính startDate và endDate (inclusive) cho từng event
  const processedEvents = events.map((e) => {
    const startIso = e.start.split("T")[0];
    let endIso = startIso;

    if (e.end) {
      if (e.source === "google" && e.allDay) {
        const endD = parseISO(e.end.split("T")[0]);
        endD.setDate(endD.getDate() - 1);
        endIso = formatFns(endD, "yyyy-MM-dd");
      } else {
        endIso = e.end.split("T")[0];
      }
    }
    
    if (endIso < startIso) endIso = startIso;

    const startD = parseISO(startIso);
    const endD = parseISO(endIso);
    const diffTime = Math.abs(endD.getTime() - startD.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return { ...e, startIso, endIso, durationDays };
  });

  processedEvents.sort((a, b) => {
    if (b.durationDays !== a.durationDays) {
      return b.durationDays - a.durationDays;
    }
    return a.startIso.localeCompare(b.startIso);
  });

  for (const e of processedEvents) {
    const eStartD = parseISO(e.startIso);
    const eEndD = parseISO(e.endIso);
    
    const renderStartD = new Date(Math.max(eStartD.getTime(), viewStartDate.getTime()));
    const renderEndD = new Date(Math.min(eEndD.getTime(), viewEndDate.getTime()));

    if (renderStartD > renderEndD) continue;

    const daysToRender: string[] = [];
    const cur = new Date(renderStartD);
    while (cur <= renderEndD) {
      daysToRender.push(formatFns(cur, "yyyy-MM-dd"));
      cur.setDate(cur.getDate() + 1);
    }

    if (daysToRender.length === 0) continue;

    let trackIndex = 0;
    let foundTrack = false;
    while (!foundTrack) {
      let isOccupied = false;
      for (const iso of daysToRender) {
        const slotAtTrack = result[iso]?.[trackIndex];
        if (slotAtTrack && slotAtTrack.event !== null) {
          isOccupied = true;
          break;
        }
      }
      if (!isOccupied) {
        foundTrack = true;
      } else {
        trackIndex++;
      }
    }

    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    for (const iso of daysToRender) {
      currentChunk.push(iso);
      const d = parseISO(iso);
      if (d.getDay() === 0) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    for (const chunk of chunks) {
      const firstIso = chunk[0];
      const lastIso = chunk[chunk.length - 1];

      for (let i = 0; i < chunk.length; i++) {
        const iso = chunk[i];
        
        while ((result[iso]?.length || 0) <= trackIndex) {
          result[iso]?.push({ event: null });
        }

        if (i === 0) {
          result[iso][trackIndex] = {
            event: e,
            isAbsolute: true,
            spanDays: chunk.length,
            continuesPrior: e.startIso < firstIso,
            continuesNext: e.endIso > lastIso,
          };
        } else {
          result[iso][trackIndex] = { event: e, isAbsolute: false };
        }
      }
    }
  }

  return result;
}
