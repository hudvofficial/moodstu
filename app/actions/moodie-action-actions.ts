"use server";

import { z } from "zod";
import { syncDriveFolder, shareGallery } from "@/app/actions/gallery-admin-actions";
import { fireAuditLog } from "@/lib/audit";
import { requireCalendarAccess } from "@/lib/calendar-auth";
import { requireContractWriteAccess, withAuth } from "@/lib/auth_utils";

const actionSchema = z.object({
  kind: z.enum(["sync_drive_gallery", "refresh_gallery_share", "sync_google_calendar"]),
  label: z.string().trim().min(1).max(160),
  targetId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
});

export async function requestMoodieActionApproval(input: z.infer<typeof actionSchema>) {
  return withAuth(async (supabase, userId) => {
    const parsed = actionSchema.parse(input);
    if (parsed.kind === "sync_google_calendar") {
      await requireCalendarAccess(supabase, userId, "đồng bộ Google Calendar từ Moodie");
      const { data } = await supabase.from("schedules").select("id").eq("id", parsed.targetId).maybeSingle();
      if (!data) throw new Error("Lịch cần đồng bộ không tồn tại.");
    } else {
      await requireContractWriteAccess(supabase, userId);
      const { data } = await supabase.from("galleries").select("id").eq("id", parsed.targetId).maybeSingle();
      if (!data) throw new Error("Gallery cần thao tác không tồn tại.");
    }

    const { data, error } = await supabase
      .from("moodie_action_approvals")
      .insert({
        user_id: userId,
        conversation_id: parsed.conversationId || null,
        action_kind: parsed.kind,
        action_label: parsed.label,
        payload: { target_id: parsed.targetId },
        risk: parsed.kind === "refresh_gallery_share" ? "medium" : "low",
        status: "pending",
      })
      .select("id, status, expires_at")
      .single();
    if (error) throw new Error(`Không thể tạo yêu cầu xác nhận: ${error.message}`);
    return data;
  });
}

function googleCalendarPayload(schedule: {
  title: string | null;
  description: string | null;
  location: string | null;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
}) {
  const allDay = !schedule.start_time;
  return {
    summary: schedule.title || "Lịch studio",
    description: schedule.description || undefined,
    location: schedule.location || undefined,
    start: allDay
      ? { date: schedule.event_date }
      : { dateTime: `${schedule.event_date}T${schedule.start_time}`, timeZone: "Asia/Ho_Chi_Minh" },
    end: allDay
      ? { date: schedule.end_date || schedule.event_date }
      : { dateTime: `${schedule.end_date || schedule.event_date}T${schedule.end_time || schedule.start_time}`, timeZone: "Asia/Ho_Chi_Minh" },
  };
}

export async function approveAndExecuteMoodieAction(approvalId: string) {
  return withAuth(async (supabase, userId) => {
    const id = z.string().uuid().parse(approvalId);
    const { data: approval, error } = await supabase
      .from("moodie_action_approvals")
      .select("id, action_kind, action_label, payload, status, expires_at")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (error || !approval) throw new Error("Không tìm thấy yêu cầu xác nhận.");
    if (approval.status !== "pending") throw new Error("Yêu cầu này không còn ở trạng thái chờ xác nhận.");
    if (new Date(approval.expires_at).getTime() <= Date.now()) {
      await supabase.from("moodie_action_approvals").update({ status: "expired" }).eq("id", id);
      throw new Error("Yêu cầu xác nhận đã hết hạn.");
    }
    const payload = approval.payload as { target_id?: string };
    const targetId = z.string().uuid().parse(payload.target_id);
    await supabase
      .from("moodie_action_approvals")
      .update({ status: "approved", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending");

    let result: unknown;
    if (approval.action_kind === "sync_drive_gallery") {
      result = await syncDriveFolder(targetId);
    } else if (approval.action_kind === "refresh_gallery_share") {
      result = await shareGallery(targetId);
    } else if (approval.action_kind === "sync_google_calendar") {
      await requireCalendarAccess(supabase, userId, "đồng bộ Google Calendar từ Moodie");
      const { data: schedule, error: scheduleError } = await supabase
        .from("schedules")
        .select("id, google_event_id, title, description, location, event_date, end_date, start_time, end_time")
        .eq("id", targetId)
        .single();
      if (scheduleError) throw new Error(`Không thể tải lịch: ${scheduleError.message}`);
      const { error: queueError } = await supabase.from("google_sync_queue").insert({
        schedule_id: schedule.id,
        google_event_id: schedule.google_event_id,
        action: schedule.google_event_id ? "UPDATE" : "CREATE",
        payload: googleCalendarPayload(schedule),
      });
      if (queueError) throw new Error(`Không thể xếp hàng đồng bộ: ${queueError.message}`);
      result = { queued: true };
    } else {
      throw new Error("Loại thao tác không được hỗ trợ.");
    }

    await supabase
      .from("moodie_action_approvals")
      .update({ status: "executed", executed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    await fireAuditLog({
      action: "APPROVE",
      tableName: "moodie_action_approvals",
      recordId: id,
      performedBy: userId,
      source: "server_action",
      description: `Moodie executed ${approval.action_kind} for ${targetId}`,
      newData: { action_kind: approval.action_kind, target_id: targetId, result: "executed" },
    });
    return { status: "executed" as const, result };
  });
}
