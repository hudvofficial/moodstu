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

/** Parallel fetch for settings page (employee + prefs + admin check) */
export async function getSettingsPageData(): Promise<SettingsPageData | null> {
  const result = await withAuth(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("Chưa đăng nhập");

    // Parallel fetch for performance
    const [empResult, prefsResult] = await Promise.all([
      supabase
        .from("employees")
        .select("id, full_name, email, phone, avatar_url, department, position, role, gender, bank_name, bank_account_no, bank_account_name")
        .eq("email", user.email)
        .single(),
      supabase
        .from("notification_preferences")
        .select("onsite_reminder, deadline_reminder, overdue_alert, task_assignment, system_alerts, updated_at")
        .eq("employee_id", user.id)
        .single(),
    ]);

    if (empResult.error || !empResult.data) {
      throw new Error("Không tìm thấy hồ sơ nhân viên");
    }

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
