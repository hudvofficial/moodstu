import { fetchCalendarEvents, fetchCalendarGoogleEvents } from "@/app/actions/calendar-queries";
import type { MoodieTimelinePart } from "@/types/moodie";
import type { UnifiedCalendarEvent } from "@/types/calendar.types";

function unwrap<T>(result: { success: true; data: T } | { success: false; error: string }): T {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function monthKeysBetween(start: Date, end: Date) {
  const keys: Array<{ month: number; year: number }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last && keys.length < 3) {
    keys.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function eventKey(event: UnifiedCalendarEvent) {
  return event.googleEventId ? `google:${event.googleEventId}` : `${event.source}:${event.sourceId}`;
}

export function dedupeMoodieCalendarEvents(events: UnifiedCalendarEvent[]) {
  return [...new Map(events.map((event) => [eventKey(event), event])).values()];
}

function toTimeLabel(event: UnifiedCalendarEvent) {
  if (event.allDay) return "Cả ngày";
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.start));
}

export async function loadMoodieCalendarAgenda(params: {
  start: Date;
  end: Date;
  includeGoogle: boolean;
  includeTasks: boolean;
  limit: number;
}) {
  const months = monthKeysBetween(params.start, params.end);
  const loaders = months.flatMap(({ month, year }) => [
    fetchCalendarEvents(month, year, "month"),
    ...(params.includeGoogle ? [fetchCalendarGoogleEvents(month, year, "month")] : []),
  ]);
  const settled = await Promise.allSettled(loaders);
  const errors: string[] = [];
  const events: UnifiedCalendarEvent[] = [];

  for (const result of settled) {
    if (result.status === "rejected") {
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      continue;
    }
    try {
      events.push(...unwrap(result.value));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const filtered = dedupeMoodieCalendarEvents(events)
    .filter((event) => {
      const start = new Date(event.start).getTime();
      return start >= params.start.getTime() && start < params.end.getTime();
    })
    .filter((event) => params.includeTasks || event.source !== "task")
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
    .slice(0, params.limit);

  return {
    events: filtered,
    errors,
    totals: {
      all: filtered.length,
      studio: filtered.filter((event) => event.source === "schedule" || event.source === "contract_event").length,
      google: filtered.filter((event) => event.source === "google").length,
      tasks: filtered.filter((event) => event.source === "task").length,
    },
  };
}

export function buildCalendarTimelinePart(events: UnifiedCalendarEvent[], title: string): MoodieTimelinePart {
  const groups = new Map<string, MoodieTimelinePart["groups"][number]>();
  for (const event of events) {
    const date = event.start.slice(0, 10);
    const group = groups.get(date) || {
      date,
      label: new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }).format(new Date(event.start)),
      items: [],
    };
    const actions = [
      {
        id: `calendar-${event.id}`,
        kind: "navigate" as const,
        label: "Mở lịch",
        href: `/calendar?date=${date}`,
        description: "Xem sự kiện trong menu Lịch",
        risk: "none" as const,
        requires_approval: false,
      },
      ...(event.contractId
        ? [{
            id: `contract-${event.contractId}`,
            kind: "navigate" as const,
            label: "Mở hợp đồng",
            href: `/contracts/${event.contractId}`,
            description: "Xem chi tiết hợp đồng liên quan",
            risk: "none" as const,
            requires_approval: false,
          }]
        : []),
    ];
    group.items.push({
      id: event.id,
      time_label: toTimeLabel(event),
      title: event.title,
      subtitle: [event.customerName, event.groupLabel, event.location].filter(Boolean).join(" · ") || undefined,
      source: event.source === "schedule" || event.source === "contract_event" ? "studio" : event.source,
      status: event.status,
      actions,
    });
    groups.set(date, group);
  }
  return { type: "timeline", title, groups: [...groups.values()] };
}
