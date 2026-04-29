import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLE_PERMISSIONS, normalizeRole, type Role } from "@/types/roles";

export type CalendarAccessContext = {
  employeeId: string;
  role: Role;
  isGlobalAdmin: boolean;
};

type EmployeeRow = {
  id: string;
  role: string | null;
  status?: string | null;
};

function assertQueryOk(label: string, error: { message?: string } | null) {
  if (error) {
    throw new Error(`${label}: ${error.message || "Unknown database error"}`);
  }
}

export async function requireCalendarAccess(
  supabase: SupabaseClient,
  userId: string,
  actionLabel = "truy cập lịch",
): Promise<CalendarAccessContext> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, role, status")
    .eq("auth_user_id", userId)
    .maybeSingle();

  assertQueryOk("Lỗi tải hồ sơ nhân sự", error);

  const employee = data as EmployeeRow | null;
  if (!employee) {
    throw new Error("Chưa thiết lập hồ sơ nhân sự.");
  }

  const role = normalizeRole(employee.role);
  if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
    throw new Error(`Bạn không có quyền ${actionLabel}.`);
  }

  return {
    employeeId: employee.id,
    role,
    isGlobalAdmin: role === "admin" || role === "manager",
  };
}

export async function requireActiveCalendarEmployee(
  supabase: SupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, status")
    .eq("id", employeeId)
    .maybeSingle();

  assertQueryOk("Lỗi kiểm tra nhân sự", error);

  const employee = data as { id: string; full_name: string | null; status: string | null } | null;
  if (!employee) {
    throw new Error("Nhân sự không tồn tại.");
  }
  if (employee.status !== "active") {
    throw new Error("Nhân sự này không còn hoạt động.");
  }

  return employee;
}

export async function requireCalendarTargetEmployee(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  targetEmployeeId: string,
) {
  if (!access.isGlobalAdmin && targetEmployeeId !== access.employeeId) {
    throw new Error("Không có quyền thao tác lịch cho nhân sự khác.");
  }

  return requireActiveCalendarEmployee(supabase, targetEmployeeId);
}

export type CalendarScheduleRecord = {
  employee_id: string;
  end_date: string | null;
  google_event_id: string | null;
};

export async function requireCalendarScheduleEditable(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  scheduleId: string,
): Promise<CalendarScheduleRecord> {
  const { data, error } = await supabase
    .from("schedules")
    .select("employee_id, end_date, google_event_id")
    .eq("id", scheduleId)
    .maybeSingle();

  assertQueryOk("Lỗi tải sự kiện", error);

  const schedule = data as CalendarScheduleRecord | null;
  if (!schedule) {
    throw new Error("Không tìm thấy sự kiện.");
  }
  if (!access.isGlobalAdmin && schedule.employee_id !== access.employeeId) {
    throw new Error("Không có quyền thao tác lịch của người khác.");
  }

  return schedule;
}

export type CalendarTaskRecord = {
  assigned_to: string | null;
  contract_id?: string | null;
  work_type?: string | null;
  status?: string | null;
};

export async function requireCalendarTaskEditable(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  taskId: string,
): Promise<CalendarTaskRecord> {
  const { data, error } = await supabase
    .from("work_tasks")
    .select("assigned_to, contract_id, work_type, status")
    .eq("id", taskId)
    .maybeSingle();

  assertQueryOk("Lỗi tải nhiệm vụ", error);

  const task = data as CalendarTaskRecord | null;
  if (!task) {
    throw new Error("Không tìm thấy nhiệm vụ.");
  }
  if (!access.isGlobalAdmin && task.assigned_to !== access.employeeId) {
    throw new Error("Không có quyền thao tác nhiệm vụ của người khác.");
  }

  return task;
}

export async function requireCalendarTaskAssignable(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  taskId: string,
  targetEmployeeId: string,
): Promise<CalendarTaskRecord> {
  const { data, error } = await supabase
    .from("work_tasks")
    .select("assigned_to, contract_id, work_type, status")
    .eq("id", taskId)
    .maybeSingle();

  assertQueryOk("Lỗi tải nhiệm vụ", error);

  const task = data as CalendarTaskRecord | null;
  if (!task) {
    throw new Error("Không tìm thấy nhiệm vụ.");
  }

  await requireCalendarTargetEmployee(supabase, access, targetEmployeeId);

  if (!access.isGlobalAdmin && task.assigned_to !== null && task.assigned_to !== access.employeeId) {
    throw new Error("Không có quyền nhận nhiệm vụ của người khác.");
  }

  return task;
}
