"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import type { WorkType, TaskStatus } from "@/types/contract";

// ═══════════════════════════════════════════
// Work Task Actions — CRUD for event assignments
// Split: Overlap checks moved to task-overlap-actions.ts
// ═══════════════════════════════════════════

export async function getTasksByEvent(eventId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("work_tasks")
      .select("id, event_id, contract_id, work_type, assigned_to, status, deadline, start_date, start_time, end_time, completion_date, cost, notes, employees:assigned_to(id, full_name, avatar_url, department)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Lỗi tải tasks: ${error.message}`);
    return data || [];
  });
}

export async function getActiveEmployees() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, avatar_url, department, position")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name");
    if (error) throw new Error(`Lỗi tải nhân viên: ${error.message}`);
    return data || [];
  });
}

export async function addTask(input: {
  eventId: string; contractId: string; workType: WorkType;
  assignedTo?: string; deadline?: string; startDate?: string;
  startTime?: string; endTime?: string; cost?: number; notes?: string;
}) {
  return withAuth(async (supabase) => {
    if (!input.eventId) throw new Error("Thiếu event ID");

    const { data, error } = await supabase.from("work_tasks").insert({
      event_id: input.eventId, contract_id: input.contractId, work_type: input.workType,
      assigned_to: input.assignedTo || null, deadline: input.deadline || null,
      start_date: input.startDate || null, start_time: input.startTime || null,
      end_time: input.endTime || null, cost: input.cost || 0,
      notes: input.notes || null, status: input.assignedTo ? "dang_lam" : "chua_lam",
    }).select("id").single();
    if (error) throw new Error(`Lỗi thêm task: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "work_tasks", recordId: data?.id, description: `Thêm task: ${input.workType} (event ${input.eventId.substring(0, 8)})` });

    // Auto-update event status
    await checkAndCompleteEvent(supabase, input.eventId);

    revalidatePath("/contracts");
    return data;
  });
}

export async function deleteTask(taskId: string, eventId: string) {
  return withAuth(async (supabase) => {
    if (!taskId) throw new Error("Thiếu task ID");
    const { error } = await supabase.from("work_tasks").delete().eq("id", taskId);
    if (error) throw new Error(`Lỗi xóa task: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "work_tasks", recordId: taskId, description: `Xóa task #${taskId.substring(0, 8)}`, severity: "WARNING" });

    await checkAndCompleteEvent(supabase, eventId);
    revalidatePath("/contracts");
    return null;
  });
}

export async function toggleTaskStatus(taskId: string, newStatus: TaskStatus, eventId: string) {
  return withAuth(async (supabase) => {
    const updates: Record<string, string | null> = { status: newStatus };
    if (newStatus === "hoan_thanh") updates.completion_date = new Date().toISOString();
    else updates.completion_date = null;

    const { error } = await supabase.from("work_tasks").update(updates).eq("id", taskId);
    if (error) throw new Error(`Lỗi cập nhật status: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: taskId, description: `Task status → ${newStatus}` });
    await checkAndCompleteEvent(supabase, eventId);
    revalidatePath("/contracts");
    return null;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkAndCompleteEvent(supabase: any, eventId: string) {
  const { data: tasks } = await supabase.from("work_tasks").select("id, status").eq("event_id", eventId);
  if (!tasks || tasks.length === 0) return;

  const allDone = tasks.every((t: { status: string }) => t.status === "hoan_thanh");
  const anyInProgress = tasks.some((t: { status: string }) => t.status === "dang_lam");
  const newEventStatus = allDone ? "hoan_thanh" : anyInProgress ? "dang_lam" : "chua_lam";

  await supabase.from("contract_events").update({ status: newEventStatus }).eq("id", eventId);
}
