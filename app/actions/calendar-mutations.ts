"use server";

import { withAuth } from "@/lib/auth_utils";
import { ROLE_PERMISSIONS, normalizeRole } from "@/types/roles";
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/lib/googleCalendarService";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Cập nhật ngày tháng thông qua thao tác Kéo thả (Drag and Drop) ở Lịch.
 * Áp dụng triệt để Drag Semantic:
 * - Kéo Schedule: Cập nhật event_date. Kéo theo end_date (nếu có) đi một tỷ lệ delta tương ứng.
 * - Kéo Task: Chỉ cập nhật deadline.
 * - Kéo Google/Contract_event: Cấm.
 */
export async function updateDragDropDate(
  eventId: string,
  source: "schedule" | "task" | "google",
  newDateIso: string,
  oldDateIso?: string, // Bắt buộc truyền nếu là schedule để tính toán delta shift
): Promise<ActionResult<boolean>> {
  return withAuth(async (supabase, userId) => {
    // 1. Phân quyền tĩnh RLS-Bypass Application Level
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");
    
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền chỉnh sửa dữ liệu lịch.");
    }

    const empId = employee.id;
    const isGlobalAdmin = role === "admin" || role === "manager";

    // 2. Logic cấm từ Spec Phase 02
    if (source === "google") {
      throw new Error("Không thể thao tác dời lịch đối với sự kiện Google.");
    }

    // 3. Logic Shift Ngày
    if (source === "schedule") {
      const { data: oldRecord } = await supabase
        .from("schedules")
        .select("employee_id, end_date, google_event_id")
        .eq("id", eventId)
        .single();
        
      if (!oldRecord) throw new Error("Không tồn tại dữ liệu sự kiện.");

      if (!isGlobalAdmin && oldRecord.employee_id !== empId) {
        throw new Error("Không có quyền dời lịch của thao tác người khác.");
      }

      const updates: Record<string, string> = { event_date: newDateIso };

      // Chuyển dịch end_date nếu tồn tại bằng DeltaMs
      if (oldRecord.end_date && oldDateIso) {
        const oldTime = new Date(oldDateIso).getTime();
        const newTime = new Date(newDateIso).getTime();
        const currentEndTime = new Date(oldRecord.end_date).getTime();

        if (!isNaN(oldTime) && !isNaN(newTime) && !isNaN(currentEndTime)) {
          const deltaMs = newTime - oldTime;
          updates.end_date = new Date(currentEndTime + deltaMs).toISOString();
        }
      }

      const { error } = await supabase.from("schedules").update(updates).eq("id", eventId);
      if (error) throw new Error("Thao tác ghi Database thất bại: " + error.message);
      
      if (oldRecord.google_event_id) {
        try {
          await updateGoogleCalendarEvent(oldRecord.google_event_id, {
            start: { dateTime: new Date(updates.event_date).toISOString() },
            end: updates.end_date ? { dateTime: new Date(updates.end_date).toISOString() } : undefined
          });
        } catch (err) {
          console.warn("Best effort Google Sync drag-drop failed:", err);
        }
      }
      return true;
    }

    if (source === "task") {
      const { data: oldRecord } = await supabase
        .from("work_tasks")
        .select("assigned_to")
        .eq("id", eventId)
        .single();
        
      if (!oldRecord) throw new Error("Không tồn tại dữ liệu nhiệm vụ.");

      if (!isGlobalAdmin && oldRecord.assigned_to !== empId) {
        throw new Error("Không có quyền dời nhiện vụ của người khác.");
      }

      const { error } = await supabase.from("work_tasks").update({ deadline: newDateIso }).eq("id", eventId);
      if (error) throw new Error("Thao tác trạng cập nhật DB thất bại: " + error.message);
      return true;
    }

    throw new Error("Sự cố không xác định nguồn (invalid source)");
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
};

export async function createCalendarEvent(payload: CalendarSchedulePayload): Promise<ActionResult<{ id: string; warning?: string }>> {
  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");
    
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền chỉnh sửa dữ liệu lịch.");
    }

    const empId = employee.id;
    const isGlobalAdmin = role === "admin" || role === "manager";

    // Enforcement: Sale/Media can only create for themselves
    if (!isGlobalAdmin && payload.employee_id !== empId) {
      throw new Error("Không có quyền tạo sự kiện cho nhân sự khác.");
    }

    let googleEventId: string | null = null;
    let warningMsg: string | undefined = undefined;
    if (payload.sync_to_google) {
      try {
        const gEvent = await createGoogleCalendarEvent({
          summary: payload.title,
          start: { dateTime: new Date(payload.event_date).toISOString() },
          end: { dateTime: new Date(payload.end_date || payload.event_date).toISOString() },
        });
        googleEventId = gEvent.id;
      } catch (err) {
        warningMsg = err instanceof Error ? err.message : String(err);
        console.warn("Best effort Google Sync create failed:", warningMsg);
      }
    }

    const insertData = {
      event_type: payload.title,
      event_date: payload.event_date,
      end_date: payload.end_date || null,
      employee_id: payload.employee_id,
      status: 'scheduled',
      color_id: payload.color_id || 'blue',
      google_event_id: googleEventId
    };

    const { data, error } = await supabase
      .from("schedules")
      .insert(insertData)
      .select("id")
      .single();

    if (error) throw new Error("Tạo lịch thất bại: " + error.message);

    return { id: data.id, warning: warningMsg };
  });
}

export async function updateCalendarEvent(payload: CalendarSchedulePayload): Promise<ActionResult<{ success: boolean; warning?: string }>> {
  if (!payload.eventId) return { success: false, error: "Thiếu ID sự kiện" };

  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");
    
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền chỉnh sửa dữ liệu lịch.");
    }

    const empId = employee.id;
    const isGlobalAdmin = role === "admin" || role === "manager";

    const { data: oldRecord } = await supabase
      .from("schedules")
      .select("employee_id, google_event_id")
      .eq("id", payload.eventId)
      .single();

    if (!oldRecord) throw new Error("Không tìm thấy sự kiện");

    if (!isGlobalAdmin && oldRecord.employee_id !== empId) {
      throw new Error("Không có quyền sửa sự kiện của người khác.");
    }

    if (!isGlobalAdmin && payload.employee_id && payload.employee_id !== oldRecord.employee_id) {
      throw new Error("Không có quyền chuyển giao sự kiện cho nhân sự khác.");
    }

    const updateData: {
      event_type: string;
      event_date: string;
      end_date: string | null;
      employee_id: string;
      color_id: string;
      google_event_id?: string;
    } = {
      event_type: payload.title,
      event_date: payload.event_date,
      end_date: payload.end_date || null,
      employee_id: payload.employee_id || oldRecord.employee_id,
      color_id: payload.color_id || 'blue',
    };

    let warningMsg: string | undefined = undefined;

    if (oldRecord.google_event_id) {
       try {
          await updateGoogleCalendarEvent(oldRecord.google_event_id, {
            summary: payload.title,
            start: { dateTime: new Date(payload.event_date).toISOString() },
            end: { dateTime: new Date(payload.end_date || payload.event_date).toISOString() }
          });
       } catch (err) {
          warningMsg = err instanceof Error ? err.message : String(err);
          console.warn("Best effort Google Sync update failed:", warningMsg);
       }
    } else if (payload.sync_to_google) {
       try {
          const gEvent = await createGoogleCalendarEvent({
             summary: payload.title,
             start: { dateTime: new Date(payload.event_date).toISOString() },
             end: { dateTime: new Date(payload.end_date || payload.event_date).toISOString() }
          });
          updateData.google_event_id = gEvent.id;
       } catch (err) {
          warningMsg = err instanceof Error ? err.message : String(err);
          console.warn("Best effort Google Sync create on update failed:", warningMsg);
       }
    }

    const { error } = await supabase
      .from("schedules")
      .update(updateData)
      .eq("id", payload.eventId);

    if (error) throw new Error("Cập nhật sự kiện thất bại: " + error.message);

    return { success: true, warning: warningMsg };
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<ActionResult<{ success: boolean; warning?: string }>> {
  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");
    
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền thao tác dữ liệu lịch.");
    }

    const empId = employee.id;
    const isGlobalAdmin = role === "admin" || role === "manager";

    const { data: oldRecord } = await supabase
      .from("schedules")
      .select("employee_id, google_event_id")
      .eq("id", eventId)
      .single();

    if (!oldRecord) throw new Error("Không tìm thấy sự kiện");

    if (!isGlobalAdmin && oldRecord.employee_id !== empId) {
      throw new Error("Bạn không có quyền xoá sự kiện của người khác.");
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", eventId);

    if (error) throw new Error("Xoá sự kiện thất bại: " + error.message);

    let warningMsg: string | undefined = undefined;

    if (oldRecord.google_event_id) {
      try {
        await deleteGoogleCalendarEvent(oldRecord.google_event_id);
      } catch (err) {
        warningMsg = err instanceof Error ? err.message : String(err);
        console.warn("Best effort Google Sync delete failed:", warningMsg);
      }
    }
    
    return { success: true, warning: warningMsg };
  });
}

// ==========================================
// THÊM: Action cho phép PATCH các external Google Event
// (ví dụ: đổi màu, nhưng không lưu backend của Mood)
// ==========================================
export async function patchGoogleCalendarEvent(
  googleEventId: string, 
  updates: Record<string, any>
): Promise<ActionResult<{ success: boolean; warning?: string }>> {
  return withAuth(async (supabase, userId) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!employee) throw new Error("Chưa thiết lập hồ sơ nhân sự");
    const role = normalizeRole(employee.role);
    if (!ROLE_PERMISSIONS[role]?.includes("calendar")) {
      throw new Error("Bạn không có quyền chỉnh sửa dữ liệu lịch.");
    }

    try {
      await updateGoogleCalendarEvent(googleEventId, updates);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
