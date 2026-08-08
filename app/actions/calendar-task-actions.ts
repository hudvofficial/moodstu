"use server";

import { withAuth } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
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

type CalendarConflict = { id: string; title: string; start: string };

type ScheduleConflictRow = {
  id: string;
  event_type: string | null;
  event_date: string;
  end_date: string | null;
};

type TaskConflictRow = {
  id: string;
  work_type: string | null;
  deadline: string | null;
  start_date: string | null;
  start_time: string | null;
  end_time: string | null;
};

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

function parseLocalDateTime(value: string) {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return new Date(value);

  if (!timePart) return new Date(year, month - 1, day);

  const [hour = "0", minute = "0", second = "0"] = timePart.split(":");
  return new Date(year, month - 1, day, Number(hour), Number(minute), Number(second));
}

function toIsoMinute(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function addOneDayDate(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

function addOneMinuteDate(date: Date) {
  return new Date(date.getTime() + 60_000);
}

function buildAvailabilityInterval(startValue: string, endValue?: string | null) {
  const startDateKey = toDateKey(startValue);
  const hasExplicitEnd = Boolean(endValue);
  const start = hasExplicitEnd && startValue.includes("T")
    ? parseLocalDateTime(startValue)
    : parseLocalDateTime(startDateKey);
  const parsedEnd = endValue
    ? parseLocalDateTime(endValue)
    : addOneDayDate(start);
  const end = parsedEnd > start ? parsedEnd : addOneMinuteDate(start);

  return {
    start,
    end,
    startIso: toIsoMinute(start),
    endIso: toIsoMinute(end),
    startDay: startDateKey,
    endDay: addOneDay(toDateKey(toIsoMinute(end))),
  };
}

function buildStoredInterval(startValue: string, endValue: string | null) {
  const start = parseLocalDateTime(startValue);
  const parsedEnd = endValue
    ? parseLocalDateTime(endValue)
    : startValue.includes("T")
      ? addOneMinuteDate(start)
      : addOneDayDate(start);

  return {
    start,
    end: parsedEnd > start ? parsedEnd : addOneMinuteDate(start),
  };
}

function buildTaskInterval(task: TaskConflictRow) {
  const dateKey = task.deadline || task.start_date;
  if (!dateKey) return null;

  if (task.start_time) {
    const start = parseLocalDateTime(`${dateKey}T${task.start_time}`);
    const parsedEnd = task.end_time
      ? parseLocalDateTime(`${dateKey}T${task.end_time}`)
      : addOneMinuteDate(start);
    return {
      start,
      end: parsedEnd > start ? parsedEnd : addOneMinuteDate(start),
    };
  }

  const start = parseLocalDateTime(dateKey);
  return {
    start,
    end: addOneDayDate(start),
  };
}

function intervalsOverlap(
  left: { start: Date; end: Date },
  right: { start: Date; end: Date },
) {
  return left.start < right.end && right.start < left.end;
}

function revalidateCalendarAndProductivity() {
  revalidatePath("/calendar");
  revalidatePath("/productivity");
}

export async function assignCalendarTask(
  taskId: string,
  assignToEmployeeId: string,
): Promise<ActionResult<boolean>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
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
  endDateIso?: string | null,
  excludeCurrentId?: string,
): Promise<ActionResult<{ hasConflict: boolean; conflicts: CalendarConflict[] }>> {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const parsed = z.object({
      employeeId: z.string().trim().min(1, "Thiếu ID nhân sự"),
      dateIso: isoDateSchema,
      endDateIso: isoDateSchema.nullable().optional(),
      excludeCurrentId: z.string().trim().min(1).optional(),
    }).parse({ employeeId, dateIso, endDateIso, excludeCurrentId });

    const access = await requireCalendarAccess(supabase, userId, "truy cập lịch");
    await requireCalendarTargetEmployee(supabase, access, parsed.employeeId);

    const targetInterval = buildAvailabilityInterval(parsed.dateIso, parsed.endDateIso);

    const [schedulesResult, tasksResult] = await Promise.all([
      supabase
        .from("schedules")
        .select("id, event_type, event_date, end_date")
        .eq("employee_id", parsed.employeeId)
        .or(
          `and(event_date.lt.${targetInterval.endIso},end_date.gte.${targetInterval.startDay}),and(event_date.gte.${targetInterval.startDay},event_date.lt.${targetInterval.endIso},end_date.is.null)`,
        ),
      supabase
        .from("work_tasks")
        .select("id, work_type, deadline, start_date, start_time, end_time")
        .eq("assigned_to", parsed.employeeId)
        .or(`and(deadline.gte.${targetInterval.startDay},deadline.lt.${targetInterval.endDay}),and(deadline.is.null,start_date.gte.${targetInterval.startDay},start_date.lt.${targetInterval.endDay})`),
    ]);

    if (schedulesResult.error) {
      throw new Error(`Lỗi kiểm tra lịch cá nhân: ${schedulesResult.error.message}`);
    }
    if (tasksResult.error) {
      throw new Error(`Lỗi kiểm tra nhiệm vụ: ${tasksResult.error.message}`);
    }

    const overlapConflicts: CalendarConflict[] = [
      ...((schedulesResult.data || []) as ScheduleConflictRow[])
        .filter((schedule) => schedule.id !== parsed.excludeCurrentId)
        .filter((schedule) => intervalsOverlap(
          targetInterval,
          buildStoredInterval(schedule.event_date, schedule.end_date),
        ))
        .map((schedule) => ({
          id: schedule.id,
          title: schedule.event_type || "Sự kiện",
          start: schedule.event_date,
        })),
      ...((tasksResult.data || []) as TaskConflictRow[])
        .filter((task) => task.id !== parsed.excludeCurrentId)
        .filter((task) => {
          const taskInterval = buildTaskInterval(task);
          return taskInterval ? intervalsOverlap(targetInterval, taskInterval) : false;
        })
        .map((task) => ({
          id: task.id,
          title: task.work_type || "Nhiệm vụ",
          start: task.deadline || task.start_date || parsed.dateIso,
        })),
    ];

    return {
      hasConflict: overlapConflicts.length > 0,
      conflicts: overlapConflicts,
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
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const validTaskId = z.string().trim().min(1, "Thiếu ID công việc").parse(taskId);
    const validatedUpdates = z.object({
      status: z.enum(TASK_STATUS_VALUES, { error: "Trạng thái không hợp lệ" }).optional(),
      deadline: isoDateSchema.optional(),
      start_date: isoDateSchema.optional(),
      assigned_to: z.string().trim().min(1, "Người nhận việc không hợp lệ").optional(),
    }).parse(updates);

    const access = await requireCalendarAccess(supabase, userId, "thao tác dữ liệu lịch");
    const oldTask = await requireCalendarTaskEditable(supabase, access, validTaskId);

    const updatePayload: Database["public"]["Tables"]["work_tasks"]["Update"] = {};
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
