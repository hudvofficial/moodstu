"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog, logError } from "@/lib/audit";

// ═══════════════════════════════════════════
// Task Assignment Actions — from Schedule context
// Split from schedule-actions.ts (340 lines)
// ═══════════════════════════════════════════

// ─── ASSIGN TASK ──────────────────────────

export async function assignTask(input: { taskId: string; employeeId: string; cost?: number }) {
  return withAuth(async (supabase) => {
    if (!input.taskId || !input.employeeId) throw new Error("Thiếu taskId hoặc employeeId");

    const { error } = await supabase.from("work_tasks").update({ assigned_to: input.employeeId, cost: input.cost || 0, status: "dang_lam" }).eq("id", input.taskId);
    if (error) throw new Error(`Lỗi gán task: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: input.taskId, description: `Gán task cho NV ${input.employeeId.substring(0, 8)}` });
    revalidatePath("/schedules");
    return null;
  });
}

// ─── UPDATE TASK DEADLINE (drag & drop) ───

export async function updateTaskDeadline(input: { taskId: string; newDeadline: string }) {
  return withAuth(async (supabase) => {
    if (!input.taskId || !input.newDeadline) throw new Error("Thiếu taskId hoặc deadline");

    const { error } = await supabase.from("work_tasks").update({ deadline: input.newDeadline }).eq("id", input.taskId);
    if (error) throw new Error(`Lỗi đổi deadline: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: input.taskId, description: `Đổi deadline → ${input.newDeadline}` });
    revalidatePath("/schedules");
    return null;
  });
}

// ─── UPDATE TASK DETAILS ──────────────────

export async function updateTaskDetails(input: { taskId: string; newDeadline: string; assigneeId?: string; status: string }) {
  return withAuth(async (supabase) => {
    if (!input.taskId) throw new Error("Thiếu taskId");

    const { error } = await supabase.from("work_tasks").update({ deadline: input.newDeadline, assigned_to: input.assigneeId || null, status: input.status }).eq("id", input.taskId);
    if (error) throw new Error(`Lỗi cập nhật task: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: input.taskId, description: `Task: status=${input.status}, deadline=${input.newDeadline}` });
    revalidatePath("/schedules");
    return null;
  });
}

// ─── CHECK EMPLOYEE AVAILABILITY ──────────

export async function checkEmployeeAvailability(employeeId: string, targetDate: string, ignoreTaskId?: string) {
  return withAuth(async (supabase) => {
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
