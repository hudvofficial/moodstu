"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog, logError } from "@/lib/audit";

// ═══════════════════════════════════════════
// Schedule Actions — CRUD + Google Calendar Sync
// Split: Task management moved to task-assign-actions.ts
// ═══════════════════════════════════════════

interface ScheduleInput {
  eventType: string; scheduleDate: string; endDate: string;
  contractId?: string; employeeId?: string; notes?: string; colorId?: string; status?: string;
}

interface ScheduleUpdateInput extends ScheduleInput {
  id: string; googleEventId?: string;
}

// ─── SCHEDULE CRUD ───────────────────────────────

export async function createSchedule(input: ScheduleInput) {
  return withAuth(async (supabase, userId) => {
    const { data: newEvent, error } = await supabase.from("schedules").insert({
      event_type: input.eventType, schedule_date: input.scheduleDate, end_date: input.endDate,
      contract_id: input.contractId || null, employee_id: input.employeeId || null,
      notes: input.notes || null, color: input.colorId || null, status: input.status || "cho_xu_ly",
      created_by: userId,
    }).select("id").single();

    if (error) throw new Error(`Lỗi tạo lịch: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "schedules", recordId: newEvent?.id, description: `Tạo lịch: ${input.eventType} (${input.scheduleDate})` });

    if (newEvent) syncGoogleCalendarCreate(supabase, newEvent, input).catch(() => {});

    revalidatePath("/schedules");
    return { id: newEvent?.id };
  });
}

export async function updateSchedule(input: ScheduleUpdateInput) {
  return withAuth(async (supabase) => {
    if (!input.id) throw new Error("Thiếu schedule ID");

    const { error } = await supabase.from("schedules").update({
      event_type: input.eventType, schedule_date: input.scheduleDate, end_date: input.endDate,
      contract_id: input.contractId || null, employee_id: input.employeeId || null,
      notes: input.notes || null, color: input.colorId || null, status: input.status,
      updated_at: new Date().toISOString(),
    }).eq("id", input.id);

    if (error) throw new Error(`Lỗi cập nhật lịch: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "schedules", recordId: input.id, description: `Cập nhật lịch: ${input.eventType}` });

    if (input.googleEventId) syncGoogleCalendarUpdate(input.googleEventId, input).catch(() => {});

    revalidatePath("/schedules");
    return null;
  });
}

export async function deleteSchedule(scheduleId: string, googleEventId?: string) {
  return withAuth(async (supabase) => {
    if (!scheduleId) throw new Error("Thiếu schedule ID");

    const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);
    if (error) throw new Error(`Lỗi xóa lịch: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "schedules", recordId: scheduleId, description: `Xóa lịch #${scheduleId.substring(0, 8)}`, severity: "WARNING" });

    if (googleEventId) syncGoogleCalendarDelete(googleEventId, scheduleId).catch(() => {});

    revalidatePath("/schedules");
    return null;
  });
}

// ─── GOOGLE CALENDAR SYNC (Private helpers) ──────

 
async function syncGoogleCalendarCreate(supabase: any, newEvent: any, input: ScheduleInput) {
  try {
    const { createGoogleCalendarEvent } = await import("@/lib/googleCalendarService");
    const title = input.notes ? input.notes.split("\n")[0] : input.eventType;
    const isoStart = new Date(input.scheduleDate).toISOString();
    const isoEnd = new Date(input.endDate).toISOString();
    const googleResult = await createGoogleCalendarEvent({
      summary: title, description: input.notes || "",
      start: { dateTime: isoStart, timeZone: "Asia/Ho_Chi_Minh" },
      end: { dateTime: isoEnd, timeZone: "Asia/Ho_Chi_Minh" },
      location: "Mood Wedding Studio", colorId: input.colorId || undefined,
    });
    if (googleResult?.id) await supabase.from("schedules").update({ google_event_id: googleResult.id }).eq("id", newEvent.id);
  } catch (e) { logError({ error: e, context: "schedules.googleSync.create", tableName: "schedules" }).catch(() => {}); }
}

async function syncGoogleCalendarUpdate(gEventId: string, input: ScheduleInput) {
  try {
    const { updateGoogleCalendarEvent } = await import("@/lib/googleCalendarService");
    const title = input.notes ? input.notes.split("\n")[0] : input.eventType;
    await updateGoogleCalendarEvent(gEventId, {
      summary: title, description: input.notes || "",
      start: { dateTime: input.scheduleDate, timeZone: "Asia/Ho_Chi_Minh" },
      end: { dateTime: input.endDate, timeZone: "Asia/Ho_Chi_Minh" },
      colorId: input.colorId || undefined,
    });
  } catch (e) { logError({ error: e, context: "schedules.googleSync.update", tableName: "schedules" }).catch(() => {}); }
}

async function syncGoogleCalendarDelete(gEventId: string, scheduleId: string) {
  try {
    const { deleteGoogleCalendarEvent } = await import("@/lib/googleCalendarService");
    await deleteGoogleCalendarEvent(gEventId);
  }
  catch (e) { logError({ error: e, context: `schedules.googleSync.delete:${scheduleId}`, tableName: "schedules" }).catch(() => {}); }
}

