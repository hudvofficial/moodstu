"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import {
  requireCalendarAccess,
  requireCalendarTaskAssignable,
  requireCalendarTaskEditable,
  requireCalendarTargetEmployee,
} from "@/lib/calendar-auth";
import { z } from "zod";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const isoDateSchema = z
  .string()
  .trim()
  .min(1, "Ngày không hợp lệ")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Định dạng ngày không hợp lệ");

const TASK_STATUS_VALUES = ["chua_lam", "dang_lam", "hoan_thanh", "da_huy"] as const;

function toDateKey(value: string) {
  return value.split("T")[0];
}

function addOneDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function revalidateCalendarAndProductivity() {
  revalidatePath("/calendar");
  revalidatePath("/productivity");
}

export async function assignCalendarTask(
  taskId: string,
  assignToEmployeeId: string,
): Promise<ActionResult<boolean>> {
  return withAuth(async (supabase, userId) => {
    const parsed = z.object({
      taskId: z.string().trim().min(1, "Thiếu ID công việc"),
      assignToEmployeeId: z.string().trim().min(1, "Thiếu ID nhân sự nhận việc"),
    }).parse({ taskId, assignToEmployeeId });

    const access = await requireCalendarAccess(supabase, userId, "chỉnh sửa dữ liệu lịch");
    await requireCalendarTaskAssignable(supabase, access, parsed.taskId, parsed.assignToEmployeeId);

    const { error } = await supabase
      .from("work_tasks")
      .update({ assigned_to: parsed.assignToEmployeeId })
      .eq("id", parsed.taskId);

    if (error) throw new Error(`Lỗi giao việc: ${error.message}`);

    revalidateCalendarAndProductivity();
    return true;
  });
}

export async function checkEmployeeAvailability(
  employeeId: string,
  dateIso: string,
): Promise<ActionResult<{ hasConflict: boolean; conflicts: { id: string; title: string; start: string }[] }>> {
  return withAuth(async (supabase, userId) => {
    const parsed = z.object({
      employeeId: z.string().trim().min(1, "Thiếu ID nhân sự"),
      dateIso: isoDateSchema,
    }).parse({ employeeId, dateIso });

    const access = await requireCalendarAccess(supabase, userId, "truy cập lịch");
    await requireCalendarTargetEmployee(supabase, access, parsed.employeeId);

    const dayStart = toDateKey(parsed.dateIso);
    const dayEnd = addOneDay(dayStart);

    const [schedulesResult, tasksResult] = await Promise.all([
      supabase
        .from("schedules")
        .select("id, event_type, event_date")
        .eq("employee_id", parsed.employeeId)
        .gte("event_date", dayStart)
        .lt("event_date", dayEnd),
      supabase
        .from("work_tasks")
        .select("id, work_type, deadline, start_date")
        .eq("assigned_to", parsed.employeeId)
        .or(`and(deadline.gte.${dayStart},deadline.lt.${dayEnd}),and(deadline.is.null,start_date.gte.${dayStart},start_date.lt.${dayEnd})`),
    ]);

    if (schedulesResult.error) {
      throw new Error(`Lỗi kiểm tra lịch cá nhân: ${schedulesResult.error.message}`);
    }
    if (tasksResult.error) {
      throw new Error(`Lỗi kiểm tra nhiệm vụ: ${tasksResult.error.message}`);
    }

    const conflicts = [
      ...(schedulesResult.data || []).map((schedule) => ({
        id: schedule.id,
        title: schedule.event_type || "Sự kiện",
        start: schedule.event_date,
      })),
      ...(tasksResult.data || []).map((task) => ({
        id: task.id,
        title: task.work_type || "Nhiệm vụ",
        start: task.deadline || task.start_date || parsed.dateIso,
      })),
    ];

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  });
}

export async function updateCalendarTaskDetails(
  taskId: string,
  updates: {
    status?: string;
    deadline?: string;
    start_date?: string;
    assigned_to?: string;
  },
): Promise<ActionResult<{ updated: boolean; autoPrintTriggered: boolean }>> {
  return withAuth(async (supabase, userId) => {
    const validTaskId = z.string().trim().min(1, "Thiếu ID công việc").parse(taskId);
    const validatedUpdates = z.object({
      status: z.enum(TASK_STATUS_VALUES, { error: "Trạng thái không hợp lệ" }).optional(),
      deadline: isoDateSchema.optional(),
      start_date: isoDateSchema.optional(),
      assigned_to: z.string().trim().min(1, "Người nhận việc không hợp lệ").optional(),
    }).parse(updates);

    const access = await requireCalendarAccess(supabase, userId, "thao tác dữ liệu lịch");
    const oldTask = await requireCalendarTaskEditable(supabase, access, validTaskId);

    const updatePayload: Record<string, string> = {};
    if (validatedUpdates.status) updatePayload.status = validatedUpdates.status;
    if (validatedUpdates.deadline) updatePayload.deadline = toDateKey(validatedUpdates.deadline);
    if (validatedUpdates.start_date) updatePayload.start_date = toDateKey(validatedUpdates.start_date);
    if (validatedUpdates.assigned_to) {
      await requireCalendarTargetEmployee(supabase, access, validatedUpdates.assigned_to);
      updatePayload.assigned_to = validatedUpdates.assigned_to;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { updated: false, autoPrintTriggered: false };
    }

    const { error } = await supabase
      .from("work_tasks")
      .update(updatePayload)
      .eq("id", validTaskId);

    if (error) throw new Error(`Cập nhật nhiệm vụ thất bại: ${error.message}`);

    let autoPrintTriggered = false;
    const isPostProduction = ["retouch", "dung_phim", "hau_ky_anh"].includes(oldTask.work_type || "");
    const isCompleting = validatedUpdates.status === "hoan_thanh" && oldTask.status !== "hoan_thanh";

    if (isPostProduction && isCompleting && oldTask.contract_id) {
      const { data: pendingTasks, error: pendingError } = await supabase
        .from("work_tasks")
        .select("id")
        .eq("contract_id", oldTask.contract_id)
        .neq("status", "hoan_thanh")
        .neq("status", "da_huy")
        .neq("id", validTaskId)
        .limit(1);

      if (pendingError) {
        throw new Error(`Lỗi kiểm tra trạng thái nhiệm vụ: ${pendingError.message}`);
      }

      if (!pendingTasks || pendingTasks.length === 0) {
        autoPrintTriggered = true;
      }
    }

    revalidateCalendarAndProductivity();
    return { updated: true, autoPrintTriggered };
  });
}
