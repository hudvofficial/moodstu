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
  status: string | null;
  deleted_at: string | null;
};

function assertQueryOk(label: string, error: { message?: string } | null) {
  if (error) {
    throw new Error(`${label}: ${error.message || "Unknown database error"}`);
  }
}

function isActiveEmployee(employee: Pick<EmployeeRow, "status" | "deleted_at"> | null) {
  return !!employee && !employee.deleted_at && employee.status === "active";
}

export async function requireCalendarAccess(
  supabase: SupabaseClient,
  userId: string,
  actionLabel = "truy cap lich",
): Promise<CalendarAccessContext> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, role, status, deleted_at")
    .eq("auth_user_id", userId)
    .maybeSingle();

  assertQueryOk("Loi tai ho so nhan su", error);

  const employee = data as EmployeeRow | null;
  if (!employee) {
    throw new Error("Chua thiet lap ho so nhan su.");
  }
  if (!isActiveEmployee(employee)) {
    throw new Error("Tai khoan nhan su khong hoat dong.");
  }

  const role = normalizeRole(employee.role);
  if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
    throw new Error(`Ban khong co quyen ${actionLabel}.`);
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
    .select("id, full_name, status, deleted_at")
    .eq("id", employeeId)
    .maybeSingle();

  assertQueryOk("Loi kiem tra nhan su", error);

  const employee = data as {
    id: string;
    full_name: string | null;
    status: string | null;
    deleted_at: string | null;
  } | null;
  if (!employee) {
    throw new Error("Nhan su khong ton tai.");
  }
  if (!isActiveEmployee(employee)) {
    throw new Error("Nhan su nay khong con hoat dong.");
  }

  return employee;
}

export async function requireCalendarTargetEmployee(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  targetEmployeeId: string,
) {
  if (!access.isGlobalAdmin && targetEmployeeId !== access.employeeId) {
    throw new Error("Khong co quyen thao tac lich cho nhan su khac.");
  }

  return requireActiveCalendarEmployee(supabase, targetEmployeeId);
}

export type CalendarScheduleRecord = {
  employee_id: string;
  event_date: string;
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
    .select("employee_id, event_date, end_date, google_event_id")
    .eq("id", scheduleId)
    .maybeSingle();

  assertQueryOk("Loi tai su kien", error);

  const schedule = data as CalendarScheduleRecord | null;
  if (!schedule) {
    throw new Error("Khong tim thay su kien.");
  }
  if (!access.isGlobalAdmin && schedule.employee_id !== access.employeeId) {
    throw new Error("Khong co quyen thao tac lich cua nguoi khac.");
  }

  return schedule;
}

export type CalendarTaskRecord = {
  assigned_to: string | null;
  contract_id?: string | null;
  work_type?: string | null;
  status?: string | null;
  deadline?: string | null;
  start_date?: string | null;
};

export async function requireCalendarTaskEditable(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  taskId: string,
): Promise<CalendarTaskRecord> {
  const { data, error } = await supabase
    .from("work_tasks")
    .select("assigned_to, contract_id, work_type, status, deadline, start_date")
    .eq("id", taskId)
    .maybeSingle();

  assertQueryOk("Loi tai nhiem vu", error);

  const task = data as CalendarTaskRecord | null;
  if (!task) {
    throw new Error("Khong tim thay nhiem vu.");
  }
  if (!access.isGlobalAdmin && task.assigned_to !== access.employeeId) {
    throw new Error("Khong co quyen thao tac nhiem vu cua nguoi khac.");
  }

  return task;
}

export async function requireCalendarTaskAssignable(
  supabase: SupabaseClient,
  access: CalendarAccessContext,
  taskId: string,
  targetEmployeeId: string,
): Promise<CalendarTaskRecord> {
  const task = await requireCalendarTaskEditable(supabase, access, taskId);

  await requireCalendarTargetEmployee(supabase, access, targetEmployeeId);

  if (!access.isGlobalAdmin && task.assigned_to !== null && task.assigned_to !== access.employeeId) {
    throw new Error("Khong co quyen nhan nhiem vu cua nguoi khac.");
  }

  return task;
}
