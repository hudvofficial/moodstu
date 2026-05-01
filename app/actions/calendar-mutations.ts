"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth_utils";
import {
  requireCalendarAccess,
  requireCalendarScheduleEditable,
  requireCalendarTargetEmployee,
  requireCalendarTaskEditable,
} from "@/lib/calendar-auth";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/googleCalendarService";
import { z } from "zod";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const isoDateSchema = z
  .string()
  .trim()
  .min(1, "Ngày không hợp lệ")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Định dạng ngày không hợp lệ");

function datePart(value: string) {
  return value.split("T")[0];
}

function isDateOnly(value: string) {
  return !value.includes("T");
}

function addOneDayDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildGoogleEventDates(startValue: string, endValue?: string | null) {
  if (isDateOnly(startValue)) {
    const endDate = endValue && isDateOnly(endValue) ? endValue : startValue;
    return {
      start: { date: startValue },
      end: { date: addOneDayDateKey(endDate) },
    };
  }

  return {
    start: { dateTime: new Date(startValue).toISOString() },
    end: { dateTime: new Date(endValue || startValue).toISOString() },
  };
}

function revalidateCalendar() {
  revalidatePath("/calendar");
}

export async function updateDragDropDate(
  eventId: string,
  source: "schedule" | "task" | "google",
  newDateIso: string,
  oldDateIso?: string,
): Promise<ActionResult<boolean>> {
  return withAuth(async (supabase, userId) => {
    const parsed = z.object({
      eventId: z.string().trim().min(1, "Thiếu ID sự kiện"),
      source: z.enum(["schedule", "task", "google"], { error: "Nguồn sự kiện không hợp lệ" }),
      newDateIso: isoDateSchema,
      oldDateIso: isoDateSchema.optional(),
    }).parse({ eventId, source, newDateIso, oldDateIso });

    const access = await requireCalendarAccess(supabase, userId, "chỉnh sửa dữ liệu lịch");

    if (parsed.source === "google") {
      throw new Error("Không thể dời lịch đối với sự kiện Google.");
    }

    if (parsed.source === "schedule") {
      const oldRecord = await requireCalendarScheduleEditable(supabase, access, parsed.eventId);
      const updates: Record<string, string> = { event_date: parsed.newDateIso };

      if (oldRecord.end_date && parsed.oldDateIso) {
        const oldTime = new Date(parsed.oldDateIso).getTime();
        const newTime = new Date(parsed.newDateIso).getTime();
        const currentEndTime = new Date(oldRecord.end_date).getTime();

        if (!Number.isNaN(oldTime) && !Number.isNaN(newTime) && !Number.isNaN(currentEndTime)) {
          updates.end_date = new Date(currentEndTime + newTime - oldTime).toISOString();
        }
      }

      const { error } = await supabase.from("schedules").update(updates).eq("id", parsed.eventId);
      if (error) throw new Error(`Thao tác ghi database thất bại: ${error.message}`);

      if (oldRecord.google_event_id) {
        try {
          await updateGoogleCalendarEvent(oldRecord.google_event_id, {
            start: { dateTime: new Date(updates.event_date).toISOString() },
            end: updates.end_date ? { dateTime: new Date(updates.end_date).toISOString() } : undefined,
          });
        } catch (err) {
          console.warn("Best effort Google Sync drag-drop failed:", err);
        }
      }

      revalidateCalendar();
      return true;
    }

    const task = await requireCalendarTaskEditable(supabase, access, parsed.eventId);
    const nextDeadline = datePart(parsed.newDateIso);
    const { error } = await supabase
      .from("work_tasks")
      .update({ deadline: nextDeadline })
      .eq("id", parsed.eventId);

    if (error) throw new Error(`Cập nhật nhiệm vụ thất bại: ${error.message}`);

    revalidateCalendar();
    revalidatePath("/productivity");
    return Boolean(task);
  });
}

export type CalendarSchedulePayload = {
  eventId?: string;
  title: string;
  event_date: string;
  end_date?: string | null;
  employee_id: string;
  color_id?: string;
  sync_to_google?: boolean;
  location?: string | null;
  notes?: string | null;
};

const calendarScheduleSchema = z.object({
  eventId: z.string().trim().optional(),
  title: z.string().trim().min(1, "Tiêu đề không được để trống"),
  event_date: isoDateSchema,
  end_date: z.string().trim().nullable().optional().refine((value) => {
    if (!value) return true;
    return !Number.isNaN(new Date(value).getTime());
  }, "Ngày kết thúc không hợp lệ"),
  employee_id: z.string().trim().min(1, "Thiếu ID nhân sự"),
  color_id: z.string().trim().optional(),
  sync_to_google: z.boolean().optional(),
  location: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
}).superRefine((data, ctx) => {
  if (!data.end_date) return;

  const start = new Date(data.event_date).getTime();
  const end = new Date(data.end_date).getTime();
  if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
    ctx.addIssue({
      code: "custom",
      path: ["end_date"],
      message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
    });
  }
});

export async function createCalendarEvent(
  payload: CalendarSchedulePayload,
): Promise<ActionResult<{ id: string; warning?: string }>> {
  return withAuth(async (supabase, userId) => {
    const parsed = calendarScheduleSchema.parse(payload);
    const access = await requireCalendarAccess(supabase, userId, "chỉnh sửa dữ liệu lịch");
    await requireCalendarTargetEmployee(supabase, access, parsed.employee_id);

    const { data, error } = await supabase
      .from("schedules")
      .insert({
        event_type: parsed.title,
        event_date: parsed.event_date,
        end_date: parsed.end_date || null,
        employee_id: parsed.employee_id,
        status: "scheduled",
        color_id: parsed.color_id || "blue",
        google_event_id: null,
        location: parsed.location || null,
        notes: parsed.notes || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Tạo lịch thất bại: ${error?.message || "missing row"}`);
    }

    let warningMsg: string | undefined;

    if (parsed.sync_to_google) {
      try {
        const googleDates = buildGoogleEventDates(parsed.event_date, parsed.end_date);
        const googleEvent = await createGoogleCalendarEvent({
          summary: parsed.title,
          location: parsed.location || undefined,
          description: parsed.notes || undefined,
          start: googleDates.start,
          end: googleDates.end,
        });
        const googleEventId = typeof googleEvent?.id === "string" ? googleEvent.id : null;

        if (!googleEventId) {
          throw new Error("Google Calendar không trả về ID sự kiện.");
        }

        const { error: linkError } = await supabase
          .from("schedules")
          .update({ google_event_id: googleEventId })
          .eq("id", data.id);

        if (linkError) {
          try {
            await deleteGoogleCalendarEvent(googleEventId);
          } catch (rollbackErr) {
            console.warn("Best effort Google rollback after link failure failed:", rollbackErr);
          }
          throw new Error("Tạo lịch nội bộ thành công nhưng không lưu được liên kết Google.");
        }
      } catch (err) {
        warningMsg = err instanceof Error ? err.message : String(err);
        console.warn("Best effort Google Sync create failed:", warningMsg);
      }
    }

    revalidateCalendar();
    return { id: data.id, warning: warningMsg };
  });
}

export async function updateCalendarEvent(
  payload: CalendarSchedulePayload,
): Promise<ActionResult<{ success: boolean; warning?: string }>> {
  return withAuth(async (supabase, userId) => {
    const parsed = calendarScheduleSchema.parse(payload);
    if (!parsed.eventId) throw new Error("Thiếu ID sự kiện");

    const access = await requireCalendarAccess(supabase, userId, "chỉnh sửa dữ liệu lịch");
    const oldRecord = await requireCalendarScheduleEditable(supabase, access, parsed.eventId);
    await requireCalendarTargetEmployee(supabase, access, parsed.employee_id || oldRecord.employee_id);

    const { error } = await supabase
      .from("schedules")
      .update({
        event_type: parsed.title,
        event_date: parsed.event_date,
        end_date: parsed.end_date || null,
        employee_id: parsed.employee_id || oldRecord.employee_id,
        color_id: parsed.color_id || "blue",
        location: parsed.location || null,
        notes: parsed.notes || null,
      })
      .eq("id", parsed.eventId);

    if (error) throw new Error(`Cập nhật sự kiện thất bại: ${error.message}`);

    let warningMsg: string | undefined;

    if (oldRecord.google_event_id) {
      try {
        const googleDates = buildGoogleEventDates(parsed.event_date, parsed.end_date);
        await updateGoogleCalendarEvent(oldRecord.google_event_id, {
          summary: parsed.title,
          location: parsed.location || undefined,
          description: parsed.notes || undefined,
          start: googleDates.start,
          end: googleDates.end,
        });
      } catch (err) {
        warningMsg = err instanceof Error ? err.message : String(err);
        console.warn("Best effort Google Sync update failed:", warningMsg);
      }
    } else if (parsed.sync_to_google) {
      try {
        const googleDates = buildGoogleEventDates(parsed.event_date, parsed.end_date);
        const googleEvent = await createGoogleCalendarEvent({
          summary: parsed.title,
          location: parsed.location || undefined,
          description: parsed.notes || undefined,
          start: googleDates.start,
          end: googleDates.end,
        });
        const googleEventId = typeof googleEvent?.id === "string" ? googleEvent.id : null;

        if (!googleEventId) {
          throw new Error("Google Calendar không trả về ID sự kiện.");
        }

        const { error: linkError } = await supabase
          .from("schedules")
          .update({ google_event_id: googleEventId })
          .eq("id", parsed.eventId);

        if (linkError) {
          try {
            await deleteGoogleCalendarEvent(googleEventId);
          } catch (rollbackErr) {
            console.warn("Best effort Google rollback after link failure failed:", rollbackErr);
          }
          throw new Error("Cập nhật lịch nội bộ thành công nhưng không lưu được liên kết Google.");
        }
      } catch (err) {
        warningMsg = err instanceof Error ? err.message : String(err);
        console.warn("Best effort Google Sync create on update failed:", warningMsg);
      }
    }

    revalidateCalendar();
    return { success: true, warning: warningMsg };
  });
}

export async function deleteCalendarEvent(
  eventId: string,
): Promise<ActionResult<{ success: boolean; warning?: string }>> {
  return withAuth(async (supabase, userId) => {
    const validEventId = z.string().trim().min(1, "Thiếu ID sự kiện").parse(eventId);
    const access = await requireCalendarAccess(supabase, userId, "thao tác dữ liệu lịch");
    const oldRecord = await requireCalendarScheduleEditable(supabase, access, validEventId);

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", validEventId);

    if (error) throw new Error(`Xóa sự kiện thất bại: ${error.message}`);

    let warningMsg: string | undefined;

    if (oldRecord.google_event_id) {
      try {
        await deleteGoogleCalendarEvent(oldRecord.google_event_id);
      } catch (err) {
        warningMsg = err instanceof Error ? err.message : String(err);
        console.warn("Best effort Google Sync delete failed:", warningMsg);
      }
    }

    revalidateCalendar();
    return { success: true, warning: warningMsg };
  });
}
