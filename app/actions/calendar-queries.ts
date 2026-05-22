"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/auth_utils";
import {
  requireCalendarAccess,
  type CalendarAccessContext,
} from "@/lib/calendar-auth";
import { isMissingRpcError } from "@/lib/finance-utils";
import type { UnifiedCalendarEvent } from "@/types/calendar.types";
import { generateCalendarGroupKey, getEventColorToken } from "@/lib/utils/calendar-utils";
import { getGoogleCalendarEvents, GOOGLE_COLORS } from "@/lib/googleCalendarService";
import { getWorkTypeLabel } from "@/types/contract-constants";
import type { WorkType } from "@/types/contract";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

type CalendarScheduleRow = {
  id: string;
  event_type: string | null;
  event_date: string;
  end_date: string | null;
  employee_id: string;
  contract_id: string | null;
  status: string | null;
  google_event_id: string | null;
  color_id: string | null;
  location: string | null;
  notes: string | null;
};

type CalendarTaskRow = {
  id: string;
  contract_id: string | null;
  work_type: string | null;
  assigned_to: string | null;
  start_date: string | null;
  start_time: string | null;
  end_time: string | null;
  deadline: string | null;
  status: string | null;
  event_id: string | null;
  contracts:
    | {
        contract_code: string | null;
        customers: { full_name: string | null }[] | { full_name: string | null } | null;
      }
    | {
        contract_code: string | null;
        customers: { full_name: string | null }[] | { full_name: string | null } | null;
      }[]
    | null;
};

type CalendarMonthEventRpcRow = {
  event_source: "schedule" | "task" | string;
  id: string;
  event_type: string | null;
  event_date: string | null;
  end_date: string | null;
  employee_id: string | null;
  contract_id: string | null;
  status: string | null;
  google_event_id: string | null;
  color_id: string | null;
  location: string | null;
  notes: string | null;
  work_type: string | null;
  assigned_to: string | null;
  start_date: string | null;
  start_time: string | null;
  end_time: string | null;
  deadline: string | null;
  event_id: string | null;
  contract_code: string | null;
  customer_name: string | null;
};

const DEFAULT_CALENDAR_PROFILE_SLOW_MS = 500;

function shouldLogCalendarTiming(durationMs: number) {
  if (process.env.CALENDAR_PROFILE === "1") return true;
  if (process.env.CALENDAR_PROFILE === "0") return false;
  const configured = Number(process.env.CALENDAR_PROFILE_SLOW_MS);
  const slowMs = Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_CALENDAR_PROFILE_SLOW_MS;
  return durationMs >= slowMs;
}

async function profileCalendarSection<T>(label: string, loader: () => PromiseLike<T>): Promise<T> {
  const startedAt = performance.now();

  try {
    return await loader();
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    if (shouldLogCalendarTiming(durationMs)) {
      console.warn(`[calendar-profile] ${label}=${durationMs}ms`);
    }
  }
}

function datePart(value: string | null | undefined) {
  return value?.split("T")[0] || null;
}

function timePart(value: string | null | undefined) {
  return value?.slice(0, 5) || null;
}

function combineDateTime(dateValue: string, timeValue: string) {
  return `${dateValue}T${timeValue}`;
}

function getCalendarWindow(month: number, year: number) {
  const normalizedMonth = Math.min(12, Math.max(1, Math.trunc(month)));
  const normalizedYear = Math.trunc(year);
  const startY = normalizedMonth <= 1 ? normalizedYear - 1 : normalizedYear;
  const startM = normalizedMonth <= 1 ? 12 : normalizedMonth - 1;
  const endY = normalizedMonth >= 12 ? normalizedYear + 1 : normalizedYear;
  const endM = normalizedMonth >= 12 ? 1 : normalizedMonth + 1;
  const endExclusive = new Date(endY, endM - 1, 11);

  return {
    startDate: `${startY}-${String(startM).padStart(2, "0")}-20`,
    endExclusiveDate: `${endExclusive.getFullYear()}-${String(endExclusive.getMonth() + 1).padStart(2, "0")}-${String(endExclusive.getDate()).padStart(2, "0")}`,
  };
}

function getContractRef(task: CalendarTaskRow) {
  return Array.isArray(task.contracts) ? task.contracts[0] : task.contracts;
}

function getCustomerName(
  customers: { full_name: string | null }[] | { full_name: string | null } | null | undefined,
) {
  if (!customers) return "-";
  if (Array.isArray(customers)) return customers[0]?.full_name || "-";
  return customers.full_name || "-";
}

function mapScheduleEvent(
  schedule: CalendarScheduleRow,
  access: CalendarAccessContext,
): UnifiedCalendarEvent {
  const isOwner = schedule.employee_id === access.employeeId;
  const editable = access.isGlobalAdmin || isOwner;

  return {
    id: schedule.id,
    source: "schedule",
    sourceId: schedule.id,
    title: schedule.event_type || "Sự kiện",
    start: schedule.event_date,
    end: schedule.end_date,
    allDay: !schedule.event_date.includes("T"),
    status: schedule.status || "pending",
    employeeId: schedule.employee_id,
    contractId: schedule.contract_id,
    editable,
    draggable: editable,
    groupKey: generateCalendarGroupKey(schedule.contract_id, schedule.event_date),
    groupLabel: null,
    colorToken: getEventColorToken("schedule", null),
    backgroundColor: schedule.color_id ? GOOGLE_COLORS[schedule.color_id] || "#039be5" : null,
    googleEventId: schedule.google_event_id,
    originalDateField: "event_date",
    location: schedule.location,
    notes: schedule.notes,
  };
}

function mapTaskEvent(
  task: CalendarTaskRow,
  access: CalendarAccessContext,
): UnifiedCalendarEvent {
  const isOwner = task.assigned_to === access.employeeId;
  const editable = access.isGlobalAdmin || isOwner;
  const contractRef = getContractRef(task);
  const customerName = getCustomerName(contractRef?.customers);
  const groupLabel = contractRef?.contract_code
    ? `HĐ: ${contractRef.contract_code} (${customerName})`
    : null;

  const originalDateField = task.deadline ? "deadline" : "start_date";
  const anchorDate = task.deadline || task.start_date || new Date().toISOString();
  const anchorDay = datePart(anchorDate) || datePart(new Date().toISOString())!;
  const startTime = timePart(task.start_time);
  const endTime = timePart(task.end_time);
  const taskStart = startTime ? combineDateTime(anchorDay, startTime) : anchorDate;
  const taskEnd = startTime && endTime ? combineDateTime(anchorDay, endTime) : null;
  const taskAllDay = !startTime;

  return {
    id: task.id,
    source: "task",
    sourceId: task.id,
    title: getWorkTypeLabel((task.work_type || "khac") as WorkType),
    start: taskStart,
    end: taskEnd,
    allDay: taskAllDay,
    status: task.status || "pending",
    employeeId: task.assigned_to,
    contractId: task.contract_id,
    editable,
    draggable: editable,
    groupKey: generateCalendarGroupKey(task.contract_id, anchorDate),
    groupLabel,
    colorToken: getEventColorToken("task", task.work_type),
    googleEventId: null,
    originalDateField,
  };
}

function mapRpcCalendarEvent(
  row: CalendarMonthEventRpcRow,
  access: CalendarAccessContext,
): UnifiedCalendarEvent | null {
  if (row.event_source === "schedule") {
    if (!row.event_date || !row.employee_id) return null;
    return mapScheduleEvent(
      {
        id: row.id,
        event_type: row.event_type,
        event_date: row.event_date.replace(" ", "T"),
        end_date: row.end_date ? row.end_date.replace(" ", "T") : null,
        employee_id: row.employee_id,
        contract_id: row.contract_id,
        status: row.status,
        google_event_id: row.google_event_id,
        color_id: row.color_id,
        location: row.location,
        notes: row.notes,
      },
      access,
    );
  }

  if (row.event_source !== "task") return null;

  return mapTaskEvent(
    {
      id: row.id,
      contract_id: row.contract_id,
      work_type: row.work_type,
      assigned_to: row.assigned_to,
      start_date: row.start_date ? row.start_date.replace(" ", "T") : null,
      start_time: row.start_time,
      end_time: row.end_time,
      deadline: row.deadline ? row.deadline.replace(" ", "T") : null,
      status: row.status,
      event_id: row.event_id,
      contracts: row.contract_code
        ? {
            contract_code: row.contract_code,
            customers: { full_name: row.customer_name },
          }
        : null,
    },
    access,
  );
}

async function fetchCalendarEventsFallback(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  month: number,
  year: number,
): Promise<UnifiedCalendarEvent[]> {
  const { startDate, endExclusiveDate } = getCalendarWindow(month, year);
  const result: UnifiedCalendarEvent[] = [];

  const schedulesResult = await supabase
    .from("schedules")
    .select(`
      id, event_type, event_date, end_date, employee_id,
      contract_id, status, google_event_id, color_id, location, notes
    `)
    .gte("event_date", startDate)
    .lt("event_date", endExclusiveDate);

  if (schedulesResult.error) {
    console.error("[fetchCalendarEvents] Schedules Error:", schedulesResult.error);
    throw new Error("Lỗi tải sự kiện cá nhân");
  }

  for (const schedule of (schedulesResult.data || []) as CalendarScheduleRow[]) {
    result.push(mapScheduleEvent(schedule, access));
  }

  return result;
}

async function fetchCalendarEventsRpc(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  month: number,
  year: number,
): Promise<UnifiedCalendarEvent[]> {
  const { data, error } = await profileCalendarSection("calendar.events.rpc", () =>
    Promise.resolve(
      supabase.rpc("calendar_month_events", {
        p_month: month,
        p_year: year,
      }),
    ),
  );

  if (error && isMissingRpcError(error)) {
    return fetchCalendarEventsFallback(supabase, access, month, year);
  }
  if (error) throw new Error(`Lỗi tải lịch tháng: ${error.message}`);

  return ((data || []) as CalendarMonthEventRpcRow[])
    .map((row) => mapRpcCalendarEvent(row, access))
    .filter((event): event is UnifiedCalendarEvent => Boolean(event));
}

export async function fetchCalendarEvents(
  month: number,
  year: number,
): Promise<ActionResult<UnifiedCalendarEvent[]>> {
  return withAuth(async (supabase, userId) => {
    const access = await requireCalendarAccess(supabase, userId, "truy cập dữ liệu lịch studio");
    return fetchCalendarEventsRpc(supabase, access, month, year);
  });
}

export async function fetchCalendarGoogleEvents(
  month: number,
  year: number,
): Promise<ActionResult<UnifiedCalendarEvent[]>> {
  return withAuth(async (supabase, userId) => {
    const access = await requireCalendarAccess(supabase, userId, "truy cập dữ liệu Google Calendar");
    const { startDate, endExclusiveDate } = getCalendarWindow(month, year);

    const { data: linkedSchedules, error: linkedError } = await profileCalendarSection(
      "calendar.google.linkedIds",
      () => Promise.resolve(
        supabase
          .from("schedules")
          .select("google_event_id")
          .not("google_event_id", "is", null)
          .gte("event_date", startDate)
          .lt("event_date", endExclusiveDate),
      ),
    );

    if (linkedError) {
      throw new Error(`Lỗi tải liên kết Google Calendar: ${linkedError.message}`);
    }

    const syncedGoogleIds = new Set(
      ((linkedSchedules || []) as { google_event_id: string | null }[])
        .map((schedule) => schedule.google_event_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );
    const googleEvents = await profileCalendarSection(
      "calendar.google.events",
      () => getGoogleCalendarEvents(
        new Date(startDate).toISOString(),
        new Date(endExclusiveDate).toISOString(),
      ),
    );
    const result: UnifiedCalendarEvent[] = [];

    for (const googleEvent of googleEvents) {
      if (syncedGoogleIds.has(googleEvent.id)) continue;
      if (googleEvent.moodSource === "contract_event") continue;

      result.push({
        id: googleEvent.id,
        source: "google",
        sourceId: googleEvent.id,
        title: googleEvent.title,
        start: googleEvent.start,
        end: googleEvent.end || null,
        allDay: Boolean(googleEvent.start && !googleEvent.start.includes("T")),
        status: "published",
        employeeId: access.employeeId,
        contractId: null,
        editable: false,
        draggable: false,
        groupKey: null,
        groupLabel: null,
        colorToken: getEventColorToken("google"),
        backgroundColor: googleEvent.backgroundColor || null,
        googleEventId: googleEvent.id,
        originalDateField: "event_date",
        originalGoogleEvent: {
          id: googleEvent.id,
          htmlLink: googleEvent.htmlLink,
          colorId: googleEvent.colorId,
        },
      });
    }

    return result;
  });
}

export async function fetchCalendarFilterEmployees(): Promise<ActionResult<{ id: string; full_name: string }[]>> {
  return withAuth(async (supabase, userId) => {
    await requireCalendarAccess(supabase, userId, "tải nhân sự");

    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name", { ascending: true });

    if (error) throw new Error("Lỗi tải danh sách bộ lọc nhân sự.");

    return (data || []) as { id: string; full_name: string }[];
  });
}

export async function checkGoogleCalendarStatus(): Promise<ActionResult<boolean>> {
  return withAuth(async (supabase, userId) => {
    await requireCalendarAccess(supabase, userId, "truy cập dữ liệu lịch");

    const { data, error } = await supabase
      .from("studio_info")
      .select("google_oauth")
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return Boolean(data?.google_oauth);
  });
}
