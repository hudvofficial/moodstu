"use server";

import { withAuth } from "@/lib/auth_utils";
import type { UnifiedCalendarEvent } from "@/types/calendar.types";
import { generateCalendarGroupKey, getEventColorToken } from "@/lib/utils/calendar-utils";
import { getGoogleCalendarEvents, GOOGLE_COLORS } from "@/lib/googleCalendarService";
import { getWorkTypeLabel } from "@/types/contract-constants";
import type { WorkType } from "@/types/contract";

import { ROLE_PERMISSIONS, normalizeRole } from "@/types/roles";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

function datePart(value: string | null | undefined) {
  return value?.split("T")[0] || null;
}

function timePart(value: string | null | undefined) {
  return value?.slice(0, 5) || null;
}

function combineDateTime(dateValue: string, timeValue: string) {
  return `${dateValue}T${timeValue}`;
}

/**
 * Fetch toàn bộ dữ liệu lịch hiển thị trong giao diện tháng.
 * Đã hợp nhất các bảng (schedules, work_tasks) và ép kiểu theo UnifiedCalendarEvent.
 * Đã xử lý Application-level RBAC (admin/manager full, user own).
 */
export async function fetchCalendarEvents(
  month: number,
  year: number,
): Promise<ActionResult<UnifiedCalendarEvent[]>> {
  return withAuth(async (supabase, userId) => {
    // 1. Phân quyền App-Level
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) {
      throw new Error("Không tìm thấy hồ sơ nhân sự.");
    }

    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền truy cập dữ liệu lịch studio.");
    }

    const empId = employee.id;
    // Theo RBAC Matrix chuẩn:
    const isGlobalAdmin = role === "admin" || role === "manager";

    // 2. Định nghĩa khoản thời gian (cộng trừ khoảng 10 ngày để cover đầu/cuối lưới tháng)
    const startY = month <= 1 ? year - 1 : year;
    const startM = month <= 1 ? 12 : month - 1;
    const endY = month >= 12 ? year + 1 : year;
    const endM = month >= 12 ? 1 : month + 1;

    // Build format YYYY-MM-DD local để Supabase hiểu đúng ngày biên, tránh offset lệch giờ của toISOString()
    const startDate = `${startY}-${String(startM).padStart(2, '0')}-20`;
    const endDate = `${endY}-${String(endM).padStart(2, '0')}-10`;

    const result: UnifiedCalendarEvent[] = [];

    const googleEventsPromise = getGoogleCalendarEvents(
      new Date(startDate).toISOString(),
      new Date(endDate).toISOString(),
    ).catch((err) => {
      console.warn("Lỗi fetch Google Calendar events:", err);
      return [];
    });

    const [schedulesResult, tasksResult, googleEvents] = await Promise.all([
      supabase
        .from("schedules")
        .select(`
          id, event_type, event_date, end_date, employee_id,
          contract_id, status, google_event_id, color_id, role_in_event
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
        // Calendar anchor is COALESCE(deadline, start_date). start_time is only HH:mm for on-set tasks.
        .or(`and(deadline.gte.${startDate},deadline.lte.${endDate}),and(deadline.is.null,start_date.gte.${startDate},start_date.lte.${endDate})`),
      googleEventsPromise,
    ]);

    const { data: schedulesData, error: errSchedules } = schedulesResult;
    const { data: tasksData, error: errTasks } = tasksResult;

    if (errSchedules) {
      console.error("[fetchCalendarEvents] Schedules Error:", errSchedules);
      throw new Error("Lỗi tải sự kiện cá nhân");
    }

    if (errTasks) {
      console.error("[fetchCalendarEvents] Tasks Error:", errTasks);
      throw new Error("Lỗi tải danh sách nhiệm vụ");
    }

    for (const s of schedulesData || []) {
      const isOwner = s.employee_id === empId;
      const editable = isGlobalAdmin || isOwner;

      result.push({
        id: s.id,
        source: "schedule",
        sourceId: s.id,
        title: s.event_type || "Sự kiện",
        start: s.event_date,
        end: s.end_date,
        allDay: false, // schedules thường có giờ cụ thể
        status: s.status || "pending",
        employeeId: s.employee_id,
        contractId: s.contract_id,
        editable,
        draggable: editable,
        groupKey: generateCalendarGroupKey(s.contract_id, s.event_date),
        groupLabel: null,
        colorToken: getEventColorToken("schedule", null),
        backgroundColor: s.color_id ? GOOGLE_COLORS[s.color_id] || '#039be5' : null,
        googleEventId: s.google_event_id,
        originalDateField: "event_date",
      });
    }

    // Set để khử trùng lặp các sự kiện Google (tránh fetch cả từ db và từ API)
    const syncedGoogleIds = new Set((schedulesData || []).map(s => s.google_event_id).filter(Boolean));

    for (const t of tasksData || []) {
      const isOwner = t.assigned_to === empId;
      const editable = isGlobalAdmin || isOwner;

      // Unpack nested contract info
      const contractRef = (Array.isArray(t.contracts) ? t.contracts[0] : t.contracts) as {
        contract_code: string | null;
        customers: { full_name: string | null }[] | { full_name: string | null } | null;
      } | null;

      const customerNodes = contractRef?.customers;
      const customerName = customerNodes
        ? Array.isArray(customerNodes)
          ? customerNodes[0]?.full_name || "-"
          : customerNodes.full_name || "-"
        : "-";
      
      const groupLabel = contractRef?.contract_code
        ? `HĐ: ${contractRef.contract_code} (${customerName})`
        : null;

      // Lấy deadline làm mốc neo chính, fallback sang start_date nếu task chưa có deadline.
      const anchorDate = t.deadline || t.start_date || new Date().toISOString();
      const anchorDay = datePart(anchorDate) || datePart(new Date().toISOString())!;
      const startTime = timePart(t.start_time);
      const endTime = timePart(t.end_time);
      const taskStart = startTime ? combineDateTime(anchorDay, startTime) : anchorDate;
      const taskEnd = startTime && endTime ? combineDateTime(anchorDay, endTime) : null;
      const taskAllDay = !startTime;

      result.push({
        id: t.id,
        source: "task",
        sourceId: t.id,
        title: getWorkTypeLabel((t.work_type || "khac") as WorkType),
        start: taskStart,
        end: taskEnd,
        allDay: taskAllDay,
        status: t.status || "pending",
        employeeId: t.assigned_to,
        contractId: t.contract_id,
        editable,
        draggable: editable, // Có thể dời deadline
        groupKey: generateCalendarGroupKey(t.contract_id, anchorDate),
        groupLabel,
        colorToken: getEventColorToken("task", t.work_type),
        googleEventId: null,
        originalDateField: "deadline",
      });
    }

    for (const ge of googleEvents) {
      if (syncedGoogleIds.has(ge.id)) continue; // Bỏ qua nếu sự kiện Google đã được mapping từ DB (schedules)
      if (ge.moodSource === "contract_event") continue; // Google mirror của contract_events đã hiện qua work_tasks nội bộ

      result.push({
        id: ge.id,
        source: "google",
        sourceId: ge.id,
        title: ge.title,
        start: ge.start,
        end: ge.end || null,
        allDay: ge.start && !ge.start.includes("T"),
        status: "published",
        employeeId: empId,
        contractId: null,
        editable: false,
        draggable: false,
        groupKey: null,
        groupLabel: null,
        colorToken: getEventColorToken("google"),
        backgroundColor: ge.backgroundColor || null,
        googleEventId: ge.id,
        originalDateField: "event_date",
        originalGoogleEvent: {
          id: ge.id,
          htmlLink: ge.htmlLink,
          colorId: ge.colorId,
        },
      });
    }

    return result;
  });
}

/**
 * Lấy danh sách nhân sự active cho dropdown filter.
 * Có App-Level guard để chắc chắn chỉ role hợp lệ mới fetch được.
 */
export async function fetchCalendarFilterEmployees(): Promise<ActionResult<{ id: string; full_name: string }[]>> {
  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa có hồ sơ nhân sự.");
    
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Không có quyền tải nhân sự.");
    }

    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name", { ascending: true });
      
    if (error) throw new Error("Lỗi tải danh sách bộ lọc nhân sự.");
    
    return (data || []) as { id: string; full_name: string }[];
  });
}

/**
 * Kiểm tra xem Studio hiện tại đã cấu hình Google Calendar Auth chưa.
 * Trả về true/false để Client ẩn hiện phần Toggle đồng bộ cho phù hợp.
 */
export async function checkGoogleCalendarStatus(): Promise<ActionResult<boolean>> {
  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền truy cập dữ liệu lịch.");
    }

    const { data, error } = await supabase
      .from("studio_info")
      .select("google_calendar_auth")
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return !!data?.google_calendar_auth;
  });
}
