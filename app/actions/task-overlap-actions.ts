"use server";

import { requireContractAccess, withAuthRead } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logConflict, logError } from "@/lib/audit";

// ═══════════════════════════════════════════
// Task Overlap Actions — Time + Deadline conflict checks
// Split from work-task-actions.ts (316 lines)
// V1 ref: contract-events/validation.ts
// ═══════════════════════════════════════════

// ─── TIME OVERLAP (On-set only) ───────────
// Logic: startA < endB AND endA > startB

export async function checkEmployeeTimeOverlap(
  employeeId: string, eventDate: string, targetStartTime: string, targetEndTime: string, excludeTaskId?: string
) {
  return withAuthRead(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractAccess(supabase, userId);

    let query = supabase
      .from("work_tasks")
      .select("id, work_type, start_time, end_time, contract_events!inner(title, event_date)")
      .eq("assigned_to", employeeId)
      .eq("contract_events.event_date", eventDate)
      .neq("status", "da_huy")
      .not("start_time", "is", null)
      .not("end_time", "is", null);

    if (excludeTaskId) query = query.neq("id", excludeTaskId);

    const { data, error } = await query;
    if (error) return { hasConflict: false, conflicts: [] };

    const conflicts = (data || [])
      .filter((task) => task.start_time < targetEndTime && task.end_time > targetStartTime)
      .map((task) => ({
        id: task.id, work_type: task.work_type, start_time: task.start_time, end_time: task.end_time,
        event_title: Array.isArray(task.contract_events) ? task.contract_events[0]?.title || "" : task.contract_events?.title || "",
      }));

    return { hasConflict: conflicts.length > 0, conflicts };
  });
}

// ─── DEADLINE OVERLAP (Post-Production) ───

export async function checkEmployeeDeadlineOverlap(
  employeeId: string, targetDeadline: string, ignoreTaskId?: string, ignoreContractId?: string
) {
  return withAuthRead(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractAccess(supabase, userId);

    const deadlineDate = targetDeadline.split("T")[0];

    let query = supabase.from("work_tasks").select("id, contract_id, work_type, deadline")
      .eq("assigned_to", employeeId).neq("status", "da_huy").not("deadline", "is", null);

    if (ignoreTaskId) query = query.neq("id", ignoreTaskId);
    if (ignoreContractId) query = query.neq("contract_id", ignoreContractId);

    const { data, error } = await query;
    if (error) {
      logError({ error, context: "checkEmployeeDeadlineOverlap", tableName: "work_tasks" }).catch(() => {});
      return { hasOverlap: false, overlaps: [] };
    }

    const overlaps = (data || [])
      .filter((task: { deadline: string }) => task.deadline?.split("T")[0] === deadlineDate)
      .map((task: { id: string; work_type: string; deadline: string }) => ({ id: task.id, work_type: task.work_type, deadline: task.deadline }));

    if (overlaps.length > 0) logConflict({ employeeId, conflictType: "deadline_overlap", conflicts: overlaps }).catch(() => {});

    return { hasOverlap: overlaps.length > 0, overlaps };
  });
}
