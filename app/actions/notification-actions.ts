"use server";

import { withAuth, withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
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
  const { data: emp } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_user_id", userId)
    .single();

  return emp?.id || null;
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
    throw new Error(`Loi tai cai dat thong bao: ${error.message}`);
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
      `Loi khoi tao cai dat thong bao: ${createError?.message || "Unknown"}`,
    );
  }

  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...created };
}

export async function getUnreadCount(): Promise<number> {
  const result = await withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) return 0;

    const { count } = await supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", empId)
      .is("read_at", null);

    return count || 0;
  });

  return result.success ? result.data : 0;
}

export async function getNotifications(offset: number = 0, limit: number = 20) {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Chua dang nhap");

    const { data, count, error } = await supabase
      .from("notification_queue")
      .select(
        "id, employee_id, type, title, content, status, read_at, resource_type, resource_id, created_at",
        { count: "exact" },
      )
      .eq("employee_id", empId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Loi tai thong bao: ${error.message}`);
    return { items: (data || []) as AppNotification[], total: count || 0 };
  });
}

export async function markAsRead(id: string) {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Khong tim thay nhan vien");

    const { error } = await supabase
      .from("notification_queue")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("employee_id", empId);

    if (error) throw new Error(`Loi danh dau: ${error.message}`);
    return null;
  });
}

export async function markAllAsRead() {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Khong tim thay nhan vien");

    const { error } = await supabase
      .from("notification_queue")
      .update({ read_at: new Date().toISOString() })
      .eq("employee_id", empId)
      .is("read_at", null);

    if (error) throw new Error(`Loi danh dau tat ca: ${error.message}`);
    return null;
  });
}

export async function getNotificationPreferences() {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Chua dang nhap");

    return getOrCreatePreferences(supabase, empId);
  });
}

export async function updateNotificationPreferences(
  rawPrefs: Record<string, boolean>,
) {
  return withAuth(async (supabase, userId) => {
    const empId = await getEmployeeId(supabase, userId);
    if (!empId) throw new Error("Khong tim thay nhan vien");

    const parsed = notificationPrefsSchema.safeParse(rawPrefs);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || "Du lieu khong hop le";
      throw new Error(firstError);
    }

    const { error } = await supabase.from("notification_preferences").upsert(
      {
        employee_id: empId,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" },
    );

    if (error) throw new Error(`Loi cap nhat cai dat: ${error.message}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "notification_preferences",
      recordId: empId,
      description: "Cap nhat cai dat thong bao",
      newData: parsed.data as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}
