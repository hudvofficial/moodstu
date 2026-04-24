"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
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
  if (eventType === "chuan_bi") return ["concept", "kich_ban"];

  if (eventType === "ngay_chup") {
    if (serviceType === "media") return ["quay_phim", "cameraman"];
    if (serviceType === "ky_yeu") return ["chup_anh", "quay_phim", "tro_ly"];
    return ["chup_anh", "makeup", "tro_ly"];
  }

  if (eventType === "ngay_to_chuc") {
    return ["chup_anh", "quay_phim", "makeup", "cameraman"];
  }

  if (eventType === "hau_ky") {
    if (serviceType === "media") return ["dung_phim", "bien_tap"];
    if (["combo", "ngay_cuoi"].includes(serviceType)) {
      return ["hau_ky_anh", "dung_phim", "retouch"];
    }
    return ["hau_ky_anh", "retouch"];
  }

  if (eventType === "giao_san_pham") return ["khac"];
  return ["khac"];
}

function getTaskDates(event: ContractEventForTasks) {
  const date = event.event_date || event.deadline || null;
  return {
    deadline: date,
    start_date: event.event_date || null,
  };
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


export async function generateWorkTasksForContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

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
      const dates = getTaskDates(event);
      return getDefaultWorkTypes(contract.service_type as ServiceType, event.event_type).map((workType) => ({
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

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return { generated: data?.length || 0, message: "Work tasks generated" };
  });
}

export async function addTask(input: {
  eventId: string; contractId: string; workType: WorkType;
  assignedTo?: string; deadline?: string; startDate?: string;
  startTime?: string; endTime?: string; cost?: number; notes?: string;
}) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

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
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

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
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const updates: Record<string, string | null> = { status: newStatus };
    if (newStatus === "hoan_thanh") updates.completion_date = new Date().toISOString();
    else updates.completion_date = null;

    const { error } = await supabase.from("work_tasks").update(updates).eq("id", taskId);
    if (error) throw new Error(`Lỗi cập nhật status: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "work_tasks", recordId: taskId, description: `Task status → ${newStatus}` });
    await checkAndCompleteEvent(supabase, eventId);
    // ⚡ No revalidatePath — client uses optimistic UI (applyTaskStatusOptimistic)
    // + Realtime subscription handles multi-user sync
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
