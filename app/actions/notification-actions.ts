"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Notification Actions — CRUD + Preferences
// V1 ref: notifications.ts (200 lines, 6 fn)
// V2: withAuth for all (V1 mixed createClient + withAuth)
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

export interface NotificationPreferences {
  onsite_reminder: boolean;
  deadline_reminder: boolean;
  overdue_alert: boolean;
  task_assignment: boolean;
  system_alerts: boolean;
}

// ─── HELPER: Get employee ID ──────────────────

async function getEmployeeId(supabase: Parameters<Parameters<typeof withAuth>[0]>[0]): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data: emp } = await supabase.from("employees").select("id").eq("email", user.email).single();
  return emp?.id || null;
}

// ─── GET UNREAD COUNT ─────────────────────────

export async function getUnreadCount(): Promise<number> {
  const result = await withAuth(async (supabase) => {
    const empId = await getEmployeeId(supabase);
    if (!empId) return 0;
    const { count } = await supabase.from("notification_queue").select("id", { count: "exact", head: true }).eq("employee_id", empId).is("read_at", null);
    return count || 0;
  });
  return result.success ? result.data : 0;
}

// ─── GET NOTIFICATIONS (Paginated) ────────────

export async function getNotifications(offset: number = 0, limit: number = 20) {
  return withAuth(async (supabase) => {
    const empId = await getEmployeeId(supabase);
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
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("notification_queue").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(`Lỗi đánh dấu: ${error.message}`);
    return null;
  });
}

// ─── MARK ALL AS READ ─────────────────────────

export async function markAllAsRead() {
  return withAuth(async (supabase) => {
    const empId = await getEmployeeId(supabase);
    if (!empId) throw new Error("Không tìm thấy nhân viên");
    const { error } = await supabase.from("notification_queue").update({ read_at: new Date().toISOString() }).eq("employee_id", empId).is("read_at", null);
    if (error) throw new Error(`Lỗi đánh dấu tất cả: ${error.message}`);
    return null;
  });
}

// ─── GET PREFERENCES ──────────────────────────

export async function getNotificationPreferences() {
  return withAuth(async (supabase) => {
    const empId = await getEmployeeId(supabase);
    if (!empId) throw new Error("Chưa đăng nhập");

    const { data } = await supabase.from("notification_preferences").select("employee_id, onsite_reminder, deadline_reminder, overdue_alert, task_assignment, system_alerts").eq("employee_id", empId).single();
    const defaults: NotificationPreferences = { onsite_reminder: true, deadline_reminder: true, overdue_alert: true, task_assignment: true, system_alerts: true };
    return data ? { ...defaults, ...data } : defaults;
  });
}

// ─── UPDATE PREFERENCES ───────────────────────

export async function updateNotificationPreferences(prefs: Partial<NotificationPreferences>) {
  return withAuth(async (supabase) => {
    const empId = await getEmployeeId(supabase);
    if (!empId) throw new Error("Không tìm thấy nhân viên");

    const { error } = await supabase.from("notification_preferences").upsert({ employee_id: empId, ...prefs, updated_at: new Date().toISOString() }, { onConflict: "employee_id" });
    if (error) throw new Error(`Lỗi cập nhật cài đặt: ${error.message}`);
    revalidatePath("/settings");
    return null;
  });
}
