"use server";

import {
  requireContractAccess,
  requireContractWriteAccess,
  withAuth,
} from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import type { WorkType, TaskStatus, EventType, ServiceType } from "@/types/contract";

type ContractEventForTasks = {
  id: string;
  event_type: EventType;
  event_date: string | null;
  deadline: string | null;
};

function getDefaultWorkTypes(serviceType: ServiceType, eventType: EventType): WorkType[] {
  // Work tasks represent staff assignments. The old automation created
  // unassigned placeholder tasks, which made contract detail look like staff
  // had been added without an editable assignee.
  void serviceType;
  void eventType;
  return [];
}

function getTaskDates(event: ContractEventForTasks) {
  const date = event.event_date || event.deadline || null;
  return {
    deadline: date,
    start_date: event.event_date || null,
  };
}

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];

async function assertEventBelongsToContract(
  supabase: AdminSupabase,
  eventId: string,
  contractId: string,
) {
  const { data: event, error } = await supabase
    .from("contract_events")
    .select("id, contract_id")
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`Loi kiem tra event: ${error.message}`);
  if (!event) throw new Error("Khong tim thay event");
  if (event.contract_id !== contractId) {
    throw new Error("Event khong thuoc hop dong nay");
  }

  return event;
}

async function assertTaskBelongsToEvent(
  supabase: AdminSupabase,
  taskId: string,
  expectedEventId?: string,
) {
  const { data: task, error } = await supabase
    .from("work_tasks")
    .select("id, event_id, contract_id")
    .eq("id", taskId)
    .maybeSingle();

  if (error) throw new Error(`Loi kiem tra task: ${error.message}`);
  if (!task) throw new Error("Khong tim thay task");
  if (!task.event_id || !task.contract_id) {
    throw new Error("Task thieu lien ket event hoac hop dong");
  }
  if (expectedEventId && task.event_id !== expectedEventId) {
    throw new Error("Task khong thuoc event nay");
  }

  await assertEventBelongsToContract(supabase, task.event_id, task.contract_id);
  return task;
}

// ═══════════════════════════════════════════
// Work Task Actions — CRUD for event assignments
// Split: Overlap checks moved to task-overlap-actions.ts
// ═══════════════════════════════════════════

export async function getTasksByEvent(eventId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("work_tasks")
      .select("id, event_id, contract_id, work_type, assigned_to, status, deadline, start_date, start_time, end_time, completion_date, cost, notes, employees:assigned_to(id, full_name, avatar_url, department)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Lỗi tải tasks: ${error.message}`);
    return data || [];
  });
}

// ─── getActiveEmployees → MOVED to employee-queries.ts ───


/** Internal: skip auth — for use within already-authenticated server actions */
export async function _generateWorkTasksInternal(
  supabase: Parameters<Parameters<typeof withAuth>[0]>[0],
  contractId: string,
  userId: string,
) {
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, service_type")
    .eq("id", contractId)
    .is("deleted_at", null)
    .single();

  if (contractError || !contract) {
    throw new Error(`Khong tim thay hop dong: ${contractError?.message || ""}`);
  }

  const { count, error: countError } = await supabase
    .from("work_tasks")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId);

  if (countError) throw new Error(`Loi kiem tra task: ${countError.message}`);
  if (count && count > 0) {
    return { generated: 0, message: "Work tasks already exist" };
  }

  const { data: events, error: eventError } = await supabase
    .from("contract_events")
    .select("id, event_type, event_date, deadline")
    .eq("contract_id", contractId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (eventError) throw new Error(`Loi tai event de tao task: ${eventError.message}`);
  if (!events || events.length === 0) {
    return { generated: 0, message: "No contract events for task generation" };
  }

  const rows = (events as ContractEventForTasks[]).flatMap((event) => {
    const workTypes = getDefaultWorkTypes(contract.service_type as ServiceType, event.event_type);
    if (workTypes.length === 0) return [];

    const dates = getTaskDates(event);
    return workTypes.map((workType) => ({
      contract_id: contractId,
      event_id: event.id,
      work_type: workType,
      status: "chua_lam",
      deadline: dates.deadline,
      start_date: dates.start_date,
      cost: 0,
      created_by: userId,
    }));
  });

  if (rows.length === 0) {
    return { generated: 0, message: "Automatic staff task generation disabled" };
  }

  const { data, error } = await supabase
    .from("work_tasks")
    .insert(rows)
    .select("id");

  if (error) throw new Error(`Loi tao task tu dong: ${error.message}`);

  fireAuditLog({
    action: "CREATE",
    tableName: "work_tasks",
    recordId: contractId,
    description: `Auto generated ${data?.length || 0} work tasks`,
    source: "server_action",
  });

  return { generated: data?.length || 0, message: "Work tasks generated" };
}

export async function generateWorkTasksForContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);
    const result = await _generateWorkTasksInternal(supabase, contractId, userId);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath("/productivity");
    return result;
  });
}

export async function addTask(input: {
  eventId: string; contractId: string; workType: WorkType;
  assignedTo?: string; deadline?: string; startDate?: string;
  startTime?: string; endTime?: string; cost?: number; notes?: string;
}) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);

    if (!input.eventId) throw new Error("Thiếu event ID");

    if (!input.contractId) throw new Error("Thieu contract ID");
    await assertEventBelongsToContract(supabase, input.eventId, input.contractId);

    const { data, error } = await supabase.from("work_tasks").insert({
      event_id: input.eventId, contract_id: input.contractId, work_type: input.workType,
      assigned_to: input.assignedTo || null, deadline: input.deadline || null,
      start_date: input.startDate || null, start_time: input.startTime || null,
      end_time: input.endTime || null, cost: input.cost || 0,
      notes: input.notes || null, status: input.assignedTo ? "dang_lam" : "chua_lam",
      created_by: userId,
    }).select("id").single();
    if (error) throw new Error(`Lỗi thêm task: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "work_tasks", recordId: data?.id, description: `Thêm task: ${input.workType} (event ${input.eventId.substring(0, 8)})` });

    // Auto-update event status
    await checkAndCompleteEvent(supabase, input.eventId);

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);
    revalidatePath("/productivity");
    return data;
  });
}

export async function deleteTask(taskId: string, eventId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);

    if (!taskId) throw new Error("Thiếu task ID");
    const task = await assertTaskBelongsToEvent(supabase, taskId, eventId);
    const { error } = await supabase
      .from("work_tasks")
      .delete()
      .eq("id", taskId)
      .eq("event_id", task.event_id);
    if (error) throw new Error(`Lỗi xóa task: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "work_tasks", recordId: taskId, description: `Xóa task #${taskId.substring(0, 8)}`, severity: "WARNING" });

    await checkAndCompleteEvent(supabase, task.event_id);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${task.contract_id}`);
    revalidatePath("/productivity");
    return null;
  });
}

export async function toggleTaskStatus(taskId: string, newStatus: TaskStatus, eventId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);
    const task = await assertTaskBelongsToEvent(supabase, taskId, eventId);

    const updates: Record<string, string | null> = { status: newStatus };
    if (newStatus === "hoan_thanh") updates.completion_date = new Date().toISOString();
    else updates.completion_date = null;

    const { error } = await supabase
      .from("work_tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("event_id", task.event_id)
      .eq("contract_id", task.contract_id);
    if (error) throw new Error(`Lỗi cập nhật status: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: taskId, description: `Task status → ${newStatus}` });
    await checkAndCompleteEvent(supabase, task.event_id);
    revalidatePath("/productivity");
    // ⚡ No revalidatePath — client uses optimistic UI (applyTaskStatusOptimistic)
    // + Realtime subscription handles multi-user sync
    return null;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkAndCompleteEvent(supabase: any, eventId: string) {
  const { data: event, error: eventError } = await supabase
    .from("contract_events")
    .select("id, status")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) throw new Error(`Loi kiem tra event: ${eventError.message}`);
  if (!event || event.status === "da_huy") return;

  const { data: tasks, error: taskError } = await supabase
    .from("work_tasks")
    .select("id, status")
    .eq("event_id", eventId)
    .neq("status", "da_huy");

  if (taskError) throw new Error(`Loi kiem tra task: ${taskError.message}`);
  if (!tasks || tasks.length === 0) {
    const { error: updateError } = await supabase
      .from("contract_events")
      .update({ status: "chua_lam" })
      .eq("id", eventId)
      .neq("status", "da_huy");
    if (updateError) throw new Error(`Loi cap nhat event: ${updateError.message}`);
    return;
  }

  const allDone = tasks.every((t: { status: string }) => t.status === "hoan_thanh");
  const anyInProgress = tasks.some((t: { status: string }) => t.status === "dang_lam");
  const newEventStatus = allDone ? "hoan_thanh" : anyInProgress ? "dang_lam" : "chua_lam";

  const { error: updateError } = await supabase
    .from("contract_events")
    .update({ status: newEventStatus })
    .eq("id", eventId)
    .neq("status", "da_huy");

  if (updateError) throw new Error(`Loi cap nhat event: ${updateError.message}`);
}
