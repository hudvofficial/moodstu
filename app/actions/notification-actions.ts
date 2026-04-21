"use server";

import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { withAuth, withAdmin } from "@/lib/auth_utils";
import { notificationPrefsSchema } from "@/lib/validations/settings.schema";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/types/settings";

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

async function getEmployeeId(
  supabase: Parameters<Parameters<typeof withAuth>[0]>[0],
  userId: string,
): Promise<string | null> {
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_user_id", userId)
    .single();

  return employee?.id || null;
}

async function getOrCreatePreferences(
  supabase: Parameters<Parameters<typeof withAdmin>[0]>[0],
  employeeId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "employee_id, onsite_reminder, deadline_reminder, overdue_alert, task_assignment, system_alerts, updated_at",
    )
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Lỗi tải cài đặt thông báo: ${error.message}`);
  }

  if (data) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data };
  }

  const { data: created, error: createError } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        employee_id: employeeId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" },
    )
    .select(
      "employee_id, onsite_reminder, deadline_reminder, overdue_alert, task_assignment, system_alerts, updated_at",
    )
    .single();

  if (createError || !created) {
    throw new Error(
      `Lỗi khởi tạo cài đặt thông báo: ${
        createError?.message || "Không xác định"
      }`,
    );
  }

  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...created };
}

export async function getUnreadCount(): Promise<number> {
  const result = await withAuth(async (supabase, userId) => {
    const employeeId = await getEmployeeId(supabase, userId);
    if (!employeeId) return 0;

    const { count } = await supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employeeId)
      .is("read_at", null);

    return count || 0;
  });

  return result.success ? result.data : 0;
}

export async function getNotifications(offset: number = 0, limit: number = 20) {
  return withAuth(async (supabase, userId) => {
    const employeeId = await getEmployeeId(supabase, userId);
    if (!employeeId) throw new Error("Chưa đăng nhập");

    const { data, count, error } = await supabase
      .from("notification_queue")
      .select(
        "id, employee_id, type, title, content, status, read_at, resource_type, resource_id, created_at",
        { count: "exact" },
      )
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Lỗi tải thông báo: ${error.message}`);
    return { items: (data || []) as AppNotification[], total: count || 0 };
  });
}

export async function markAsRead(id: string) {
  return withAuth(async (supabase, userId) => {
    const employeeId = await getEmployeeId(supabase, userId);
    if (!employeeId) throw new Error("Không tìm thấy nhân viên");

    const { error } = await supabase
      .from("notification_queue")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("employee_id", employeeId);

    if (error) throw new Error(`Lỗi đánh dấu: ${error.message}`);
    return null;
  });
}

export async function markAllAsRead() {
  return withAuth(async (supabase, userId) => {
    const employeeId = await getEmployeeId(supabase, userId);
    if (!employeeId) throw new Error("Không tìm thấy nhân viên");

    const { error } = await supabase
      .from("notification_queue")
      .update({ read_at: new Date().toISOString() })
      .eq("employee_id", employeeId)
      .is("read_at", null);

    if (error) throw new Error(`Lỗi đánh dấu tất cả: ${error.message}`);
    return null;
  });
}

export async function getNotificationPreferences() {
  return withAuth(async (supabase, userId) => {
    const employeeId = await getEmployeeId(supabase, userId);
    if (!employeeId) throw new Error("Chưa đăng nhập");

    return getOrCreatePreferences(supabase, employeeId);
  });
}

export async function updateNotificationPreferences(
  rawPrefs: Record<string, boolean>,
) {
  return withAuth(async (supabase, userId) => {
    const employeeId = await getEmployeeId(supabase, userId);
    if (!employeeId) throw new Error("Không tìm thấy nhân viên");

    const parsed = notificationPrefsSchema.safeParse(rawPrefs);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      throw new Error(firstError);
    }

    const { error } = await supabase.from("notification_preferences").upsert(
      {
        employee_id: employeeId,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" },
    );

    if (error) throw new Error(`Lỗi cập nhật cài đặt: ${error.message}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "notification_preferences",
      recordId: employeeId,
      description: "Cập nhật cài đặt thông báo",
      newData: parsed.data as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}
