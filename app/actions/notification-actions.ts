"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { notificationPrefsSchema } from "@/lib/validations/settings.schema";

// ═══════════════════════════════════════════
// Notification Actions — CRUD + Preferences
// V2 Gold Standard: withAuth + Zod + Audit
// @see docs/specs/settings.md §3.5
// ═══════════════════════════════════════════

// ─── TYPES ────────────────────────────────────

export interface AppNotification {
  id: string;
  employee_id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  read_at: string | null;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

// Re-export from centralized types for backward compat
export type { NotificationPreferences } from "@/types/settings";

// ─── HELPER: Get employee ID ──────────────────
// [GS-FIX] Dùng userId param, KHÔNG gọi getUser() trên admin client
// [GS-FIX] Lookup bằng auth_user_id, KHÔNG dùng email

async function getEmployeeId(supabase: Parameters<Parameters<typeof withAuth>[0]>[0], userId: string): Promise<string | null> {
  const { data: emp } = await supabase.from("employees").select("id").eq("auth_user_id", userId).single();
  return emp?.id || null;
}

// ─── GET UNREAD COUNT ─────────────────────────

export async function getUnreadCount(): Promise<number> {
  const result = await withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) return 0;
    const { count } = await supabase.from("notification_queue").select("id", { count: "exact", head: true }).eq("employee_id", empId).is("read_at", null);
    return count || 0;
  });
  return result.success ? result.data : 0;
}

// ─── GET NOTIFICATIONS (Paginated) ────────────

export async function getNotifications(offset: number = 0, limit: number = 20) {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Chưa đăng nhập");

    const { data, count, error } = await supabase
      .from("notification_queue")
      .select("id, employee_id, type, title, content, status, read_at, resource_type, resource_id, created_at", { count: "exact" })
      .eq("employee_id", empId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Lỗi tải thông báo: ${error.message}`);
    return { items: (data || []) as AppNotification[], total: count || 0 };
  });
}

// ─── MARK AS READ ─────────────────────────────

export async function markAsRead(id: string) {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Không tìm thấy nhân viên");
    const { error } = await supabase.from("notification_queue").update({ read_at: new Date().toISOString() }).eq("id", id).eq("employee_id", empId);
    if (error) throw new Error(`Lỗi đánh dấu: ${error.message}`);
    return null;
  });
}

// ─── MARK ALL AS READ ─────────────────────────

export async function markAllAsRead() {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Không tìm thấy nhân viên");
    const { error } = await supabase.from("notification_queue").update({ read_at: new Date().toISOString() }).eq("employee_id", empId).is("read_at", null);
    if (error) throw new Error(`Lỗi đánh dấu tất cả: ${error.message}`);
    return null;
  });
}

// ─── GET PREFERENCES ──────────────────────────

export async function getNotificationPreferences() {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Chưa đăng nhập");

    const { data } = await supabase.from("notification_preferences").select("employee_id, onsite_reminder, deadline_reminder, overdue_alert, task_assignment, system_alerts").eq("employee_id", empId).single();
    const defaults = { onsite_reminder: true, deadline_reminder: true, overdue_alert: true, task_assignment: true, system_alerts: true };
    return data ? { ...defaults, ...data } : defaults;
  });
}

// ─── UPDATE PREFERENCES ───────────────────────

export async function updateNotificationPreferences(rawPrefs: Record<string, boolean>) {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Không tìm thấy nhân viên");

    // ── Zod validation ──
    const parsed = notificationPrefsSchema.safeParse(rawPrefs);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      throw new Error(firstError);
    }

    const { error } = await supabase.from("notification_preferences").upsert(
      { employee_id: empId, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "employee_id" },
    );
    if (error) throw new Error(`Lỗi cập nhật cài đặt: ${error.message}`);

    // Audit: notification preferences update
    fireAuditLog({
      action: "UPDATE",
      tableName: "notification_preferences",
      recordId: empId,
      description: "Cập nhật cài đặt thông báo",
      newData: parsed.data as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}
