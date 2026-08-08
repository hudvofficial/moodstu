"use server";

import { withAuth } from "@/lib/auth_utils";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";
import { fireAuditLog, logError } from "@/lib/audit";
import { ROLE_PERMISSIONS, normalizeRole } from "@/types/roles";
import type { SupabaseClient } from "@supabase/supabase-js";

type TaskMutationContext = {
  employee: { id: string; role: string | null };
  isGlobalAdmin: boolean;
};

async function getTaskMutationContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<TaskMutationContext> {
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, role")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error || !employee) {
    throw new Error("Chua thiet lap ho so nhan su");
  }

  const role = normalizeRole(employee.role);
  if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
    throw new Error("Ban khong co quyen thao tac task");
  }

  return {
    employee,
    isGlobalAdmin: role === "admin" || role === "manager",
  };
}

async function getTaskAssignee(supabase: SupabaseClient, taskId: string) {
  const { data: task, error } = await supabase
    .from("work_tasks")
    .select("assigned_to")
    .eq("id", taskId)
    .maybeSingle();

  if (error || !task) {
    throw new Error("Khong tim thay task");
  }

  return task.assigned_to;
}

function revalidateTaskViews() {
  revalidatePath("/calendar");
  revalidatePath("/schedules");
  revalidatePath("/productivity");
}

// ═══════════════════════════════════════════
// Task Assignment Actions — from Schedule context
// Split from schedule-actions.ts (340 lines)
// ═══════════════════════════════════════════

// ─── ASSIGN TASK ──────────────────────────

export async function assignTask(input: { taskId: string; employeeId: string; cost?: number }) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const context = await getTaskMutationContext(supabase, userId);
    if (!input.taskId || !input.employeeId) throw new Error("Thieu taskId hoac employeeId");
    const currentAssignee = await getTaskAssignee(supabase, input.taskId);

    if (!context.isGlobalAdmin) {
      if (input.employeeId !== context.employee.id) {
        throw new Error("Ban khong co quyen giao viec cho nguoi khac");
      }
      if (currentAssignee && currentAssignee !== context.employee.id) {
        throw new Error("Ban khong co quyen nhan task cua nguoi khac");
      }
    }
    const { error } = await supabase.from("work_tasks").update({ assigned_to: input.employeeId, cost: Math.max(0, input.cost ?? 0), status: "dang_lam" }).eq("id", input.taskId);
    if (error) throw new Error(`Lỗi gán task: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: input.taskId, description: `Gán task cho NV ${input.employeeId.substring(0, 8)}` });
    revalidateTaskViews();
    return null;
  });
}

// ─── UPDATE TASK DEADLINE (drag & drop) ───

export async function updateTaskDeadline(input: { taskId: string; newDeadline: string }) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const context = await getTaskMutationContext(supabase, userId);
    if (!input.taskId || !input.newDeadline) throw new Error("Thieu taskId hoac deadline");
    const currentAssignee = await getTaskAssignee(supabase, input.taskId);
    if (!context.isGlobalAdmin && currentAssignee !== context.employee.id) {
      throw new Error("Ban khong co quyen sua task cua nguoi khac");
    }
    const { error } = await supabase.from("work_tasks").update({ deadline: input.newDeadline }).eq("id", input.taskId);
    if (error) throw new Error(`Lỗi đổi deadline: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: input.taskId, description: `Đổi deadline → ${input.newDeadline}` });
    revalidateTaskViews();
    return null;
  });
}

// ─── UPDATE TASK DETAILS ──────────────────

export async function updateTaskDetails(input: { taskId: string; newDeadline: string; assigneeId?: string; status: string }) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const context = await getTaskMutationContext(supabase, userId);
    if (!input.taskId) throw new Error("Thieu taskId");
    const currentAssignee = await getTaskAssignee(supabase, input.taskId);
    const hasAssigneeUpdate = Object.prototype.hasOwnProperty.call(input, "assigneeId");
    const nextAssignee = input.assigneeId || null;

    if (!context.isGlobalAdmin) {
      if (currentAssignee !== context.employee.id) {
        throw new Error("Ban khong co quyen sua task cua nguoi khac");
      }
      if (hasAssigneeUpdate && nextAssignee !== context.employee.id) {
        throw new Error("Ban khong co quyen chuyen giao task");
      }
    }
    const updates: { deadline: string; status: string; assigned_to?: string | null } = {
      deadline: input.newDeadline,
      status: input.status,
    };
    if (hasAssigneeUpdate) {
      updates.assigned_to = nextAssignee;
    }

    const { error } = await supabase.from("work_tasks").update(updates).eq("id", input.taskId);
    if (error) throw new Error(`Lỗi cập nhật task: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: input.taskId, description: `Task: status=${input.status}, deadline=${input.newDeadline}` });
    revalidateTaskViews();
    return null;
  });
}

// ─── CHECK EMPLOYEE AVAILABILITY ──────────

export async function checkEmployeeAvailability(employeeId: string, targetDate: string, ignoreTaskId?: string) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const context = await getTaskMutationContext(supabase, userId);
    if (!context.isGlobalAdmin && employeeId !== context.employee.id) {
      throw new Error("Ban khong co quyen xem lich cua nguoi khac");
    }

    let query = supabase.from("work_tasks").select("id, work_type, deadline").eq("assigned_to", employeeId).eq("deadline", targetDate).neq("status", "da_huy");
    if (ignoreTaskId) query = query.neq("id", ignoreTaskId);

    const { data, error } = await query;
    if (error) {
      logError({ error, context: "schedules.checkAvailability", tableName: "work_tasks" }).catch(() => {});
      throw new Error("Lỗi kiểm tra lịch nhân viên");
    }

    return { hasConflict: (data?.length || 0) > 0, conflicts: data || [] };
  });
}
