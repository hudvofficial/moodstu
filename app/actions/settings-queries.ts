"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getAuthenticatedUserContext, withAdmin, withAuth } from "@/lib/auth_utils";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type SettingsPageData,
  type StudioInfo,
} from "@/types/settings";

async function getOrCreateNotificationPreferences(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
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
    throw new Error(`Khong the tai cai dat thong bao: ${error.message}`);
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
      `Khong the khoi tao cai dat thong bao: ${createError?.message || "Unknown"}`,
    );
  }

  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...created };
}

export async function getStudioInfoAdmin() {
  return withAdmin(async (adminClient) => {
    const { data, error } = await adminClient
      .from("studio_info")
      .select("*")
      .limit(1)
      .single();

    if (error) throw new Error(`Loi lay thong tin studio: ${error.message}`);
    return data as StudioInfo;
  });
}

export async function getStudioInfo() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("studio_info")
      .select(
        "id, name, hotline, address, logo_url, representative, timezone, bank_info, social_links, working_hours, updated_at",
      )
      .limit(1)
      .single();

    if (error) throw new Error(`Loi lay thong tin studio: ${error.message}`);
    return data as StudioInfo;
  });
}

export async function getSettingsPageData(): Promise<SettingsPageData> {
  const context = await getAuthenticatedUserContext({ bootstrapProfile: true });

  if (!context) {
    throw new Error("Chua dang nhap");
  }

  if (!context.employee) {
    throw new Error("Khong the khoi tao ho so nhan vien");
  }

  const adminClient = await createAdminClient();
  const notificationPrefs = await getOrCreateNotificationPreferences(
    adminClient,
    context.employee.id,
  );

  return {
    employee: context.employee,
    notificationPrefs,
    canManageSettings: context.canManageSettings,
    canManageMembers: context.canManageMembers,
  };
}
