"use server";

import { createAdminClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUserContext,
  withAdmin,
  withAuth,
} from "@/lib/auth_utils";
import { fetchMoodieGeminiModelOptions } from "@/lib/moodie/gemini-models";
import { MOODIE_GEMINI_MODEL_OPTIONS } from "@/lib/moodie/model-options";
import { getOrCreateStudioInfo } from "@/lib/studio-info";
import { loadStudioSettingsAdminData } from "@/lib/settings-studio-admin";
import {
  getMoodieGeminiSettingsSnapshot,
  getMoodieGeminiStoredApiKey,
} from "@/lib/system-settings";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type SettingsPageData,
  type StudioInfo,
} from "@/types/settings";
import type { AuthUserWithEmployee, AuthUsersPage } from "@/app/actions/user-management";
import { normalizeEmployeeRole } from "@/types/roles";

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
    throw new Error(`Không thể tải cài đặt thông báo: ${error.message}`);
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
      `Không thể khởi tạo cài đặt thông báo: ${
        createError?.message || "Không xác định"
      }`,
    );
  }

  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...created };
}

async function getInitialAuthUsers(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
): Promise<AuthUsersPage> {
  const page = 1;
  const perPage = 25;
  const [authResult, employeeResult] = await Promise.all([
    supabase.auth.admin.listUsers({ page, perPage }),
    supabase
      .from("employees")
      .select("id, full_name, email, role, avatar_url, auth_user_id, status")
      .eq("status", "active")
      .order("full_name"),
  ]);

  if (authResult.error) throw new Error(authResult.error.message);
  if (employeeResult.error) throw new Error(employeeResult.error.message);

  const employees = employeeResult.data || [];
  const linkedByAuthId = new Map(
    employees
      .filter((employee) => employee.auth_user_id)
      .map((employee) => [employee.auth_user_id as string, employee]),
  );
  const unlinkedByEmail = new Map(
    employees
      .filter((employee) => !employee.auth_user_id && employee.email)
      .map((employee) => [employee.email!.toLowerCase(), employee]),
  );

  const users: AuthUserWithEmployee[] = (authResult.data.users || []).map((user) => {
    const linked = linkedByAuthId.get(user.id) || null;
    const suggested = linked
      ? null
      : unlinkedByEmail.get((user.email || "").toLowerCase()) || null;

    return {
      auth_id: user.id,
      email: user.email || "",
      jwt_role: normalizeEmployeeRole(
        (user.app_metadata?.role as string | undefined) ?? null,
      ),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
      is_banned: Boolean(user.banned_until),
      linked_employee: linked,
      suggested_employee: suggested,
    };
  });

  return { users, page, perPage, hasMore: users.length === perPage };
}

export async function getStudioInfoAdmin() {
  return withAdmin(loadStudioSettingsAdminData);
}

export async function getMoodieGeminiModelOptions(
  rawData?: Record<string, unknown>,
) {
  return withAdmin(async (adminClient) => {
    const overrideApiKey =
      typeof rawData?.gemini_api_key === "string"
        ? rawData.gemini_api_key.trim()
        : "";
    const storedApiKey = overrideApiKey
      ? null
      : await getMoodieGeminiStoredApiKey(adminClient);
    const apiKey = overrideApiKey || storedApiKey;

    if (!apiKey) {
      return {
        options: [...MOODIE_GEMINI_MODEL_OPTIONS],
        source: "fallback" as const,
        message: "Lưu khóa Gemini để tải danh sách model từ API",
      };
    }

    try {
      const options = await fetchMoodieGeminiModelOptions(apiKey);
      return {
        options,
        source: "api" as const,
        message: "Đã tải danh sách model từ Gemini API",
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Không xác định";

      return {
        options: [...MOODIE_GEMINI_MODEL_OPTIONS],
        source: "fallback" as const,
        message: `Không tải được danh sách từ Gemini API: ${detail}`,
      };
    }
  });
}

export async function getStudioInfo() {
  return withAuth(async (supabase) => {
    const data = await getOrCreateStudioInfo(supabase);
    return {
      ...(data as StudioInfo),
      google_oauth: null,
    } satisfies StudioInfo;
  });
}

export async function getSettingsPageData(): Promise<SettingsPageData> {
  // ProtectedLayout already resolves this exact cached context for the request.
  // Reuse claims + employee context instead of adding a second GoTrue getUser round-trip.
  const context = await getAuthenticatedUserContext();

  if (!context) {
    throw new Error("Chưa đăng nhập");
  }

  if (!context.employee) {
    throw new Error("Không thể khởi tạo hồ sơ nhân viên");
  }

  const adminClient = await createAdminClient();
  const [notificationPrefs, initialMembers] = await Promise.all([
    getOrCreateNotificationPreferences(adminClient, context.employee.id),
    context.canManageMembers
      ? getInitialAuthUsers(adminClient)
      : Promise.resolve(undefined),
  ]);

  return {
    employee: context.employee,
    notificationPrefs,
    canManageSettings: context.canManageSettings,
    canManageMembers: context.canManageMembers,
    initialMembers,
  };
}
