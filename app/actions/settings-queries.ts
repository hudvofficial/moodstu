"use server";

import { withAuth, withAdmin } from "@/lib/auth_utils";
import type { StudioInfo, SettingsPageData } from "@/types/settings";

// ═══════════════════════════════════════════
// Settings Queries — read-only server actions
// V2 Gold Standard: withAuth for all queries
// @see docs/specs/settings.md §3.2
// ═══════════════════════════════════════════

// ─── GET STUDIO INFO ──────────────────────

/** Get studio info (single row) — Admin only */
export async function getStudioInfoAdmin() {
  return withAdmin(async (adminClient) => {
    const { data, error } = await adminClient
      .from("studio_info")
      .select("*")
      .limit(1)
      .single();

    if (error) throw new Error(`Lỗi lấy thông tin studio: ${error.message}`);
    return data as StudioInfo;
  });
}

/** Get studio info (public fields only) — any authenticated user */
export async function getStudioInfo() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("studio_info")
      .select("*")
      .limit(1)
      .single();

    if (error) throw new Error(`Lỗi lấy thông tin studio: ${error.message}`);
    return data as StudioInfo;
  });
}

// ─── GET SETTINGS PAGE DATA ───────────────

/** Fetch settings page data — employee + notification prefs + admin check */
export async function getSettingsPageData(): Promise<SettingsPageData | null> {
  const result = await withAuth(async (supabase, userId) => {
    // [GS-FIX] Dùng userId param từ withAuth, KHÔNG gọi getUser() trên admin client
    // [GS-FIX] Lookup bằng auth_user_id, KHÔNG dùng email (fragile)
    const empResult = await supabase
      .from("employees")
      .select("id, full_name, email, phone, avatar_url, department, position, role, gender")
      .eq("auth_user_id", userId)
      .single();

    if (empResult.error || !empResult.data) {
      throw new Error("Không tìm thấy hồ sơ nhân viên");
    }

    // [C5-FIX] Dùng employee.id (UUID employees table), KHÔNG dùng userId (auth UUID)
    const prefsResult = await supabase
      .from("notification_preferences")
      .select("onsite_reminder, deadline_reminder, overdue_alert, task_assignment, system_alerts, updated_at")
      .eq("employee_id", empResult.data.id)
      .single();

    const defaults = {
      onsite_reminder: true,
      deadline_reminder: true,
      overdue_alert: true,
      task_assignment: true,
      system_alerts: true,
    };

    return {
      employee: empResult.data,
      notificationPrefs: prefsResult.data
        ? { ...defaults, ...prefsResult.data }
        : defaults,
      isAdmin: empResult.data.role === "Admin",
    } as SettingsPageData;
  });

  return result.success ? result.data : null;
}
