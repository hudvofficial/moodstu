"use server";

import { withAuth } from "@/lib/auth_utils";
import { requireCalendarAccess } from "@/lib/calendar-auth";
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

  return {
    startDate: `${startY}-${String(startM).padStart(2, "0")}-20`,
    endDate: `${endY}-${String(endM).padStart(2, "0")}-10`,
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

export async function fetchCalendarEvents(
  month: number,
  year: number,
): Promise<ActionResult<UnifiedCalendarEvent[]>> {
  return withAuth(async (supabase, userId) => {
    const access = await requireCalendarAccess(supabase, userId, "truy cập dữ liệu lịch studio");
    const { startDate, endDate } = getCalendarWindow(month, year);
    const result: UnifiedCalendarEvent[] = [];

    const [schedulesResult, tasksResult] = await Promise.all([
      supabase
        .from("schedules")
        .select(`
          id, event_type, event_date, end_date, employee_id,
          contract_id, status, google_event_id, color_id
        `)
        .gte("event_date", startDate)
        .lte("event_date", endDate),
      supabase
        .from("work_tasks")
        .select(`
          id, contract_id, work_type, assigned_to,
          start_date, start_time, end_time, deadline, status, event_id,
          contracts ( contract_code, customers ( full_name ) )
        `)
        .or(`and(deadline.gte.${startDate},deadline.lte.${endDate}),and(deadline.is.null,start_date.gte.${startDate},start_date.lte.${endDate})`),
    ]);

    if (schedulesResult.error) {
      console.error("[fetchCalendarEvents] Schedules Error:", schedulesResult.error);
      throw new Error("Lỗi tải sự kiện cá nhân");
    }

    if (tasksResult.error) {
      console.error("[fetchCalendarEvents] Tasks Error:", tasksResult.error);
      throw new Error("Lỗi tải danh sách nhiệm vụ");
    }

    for (const schedule of (schedulesResult.data || []) as CalendarScheduleRow[]) {
      const isOwner = schedule.employee_id === access.employeeId;
      const editable = access.isGlobalAdmin || isOwner;

      result.push({
        id: schedule.id,
        source: "schedule",
        sourceId: schedule.id,
        title: schedule.event_type || "Sự kiện",
        start: schedule.event_date,
        end: schedule.end_date,
        allDay: false,
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
      });
    }

    for (const task of (tasksResult.data || []) as CalendarTaskRow[]) {
      const isOwner = task.assigned_to === access.employeeId;
      const editable = access.isGlobalAdmin || isOwner;
      const contractRef = getContractRef(task);
      const customerName = getCustomerName(contractRef?.customers);
      const groupLabel = contractRef?.contract_code
        ? `HĐ: ${contractRef.contract_code} (${customerName})`
        : null;

      const anchorDate = task.deadline || task.start_date || new Date().toISOString();
      const anchorDay = datePart(anchorDate) || datePart(new Date().toISOString())!;
      const startTime = timePart(task.start_time);
      const endTime = timePart(task.end_time);
      const taskStart = startTime ? combineDateTime(anchorDay, startTime) : anchorDate;
      const taskEnd = startTime && endTime ? combineDateTime(anchorDay, endTime) : null;
      const taskAllDay = !startTime;

      result.push({
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
        originalDateField: "deadline",
      });
    }

    return result;
  });
}

export async function fetchCalendarGoogleEvents(
  month: number,
  year: number,
): Promise<ActionResult<UnifiedCalendarEvent[]>> {
  return withAuth(async (supabase, userId) => {
    const access = await requireCalendarAccess(supabase, userId, "truy cập dữ liệu Google Calendar");
    const { startDate, endDate } = getCalendarWindow(month, year);

    const { data: linkedSchedules, error: linkedError } = await supabase
      .from("schedules")
      .select("google_event_id")
      .not("google_event_id", "is", null)
      .gte("event_date", startDate)
      .lte("event_date", endDate);

    if (linkedError) {
      throw new Error(`Lỗi tải liên kết Google Calendar: ${linkedError.message}`);
    }

    const syncedGoogleIds = new Set(
      (linkedSchedules || [])
        .map((schedule) => schedule.google_event_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );
    const googleEvents = await getGoogleCalendarEvents(
      new Date(startDate).toISOString(),
      new Date(endDate).toISOString(),
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
      .select("google_calendar_auth")
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return Boolean(data?.google_calendar_auth);
  });
}
