"use server";

import { createAdminClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUserContext,
  withAdmin,
  withAuth,
} from "@/lib/auth_utils";
import { fetchMoodieGeminiModelOptions } from "@/lib/moodie/gemini-models";
import { MOODIE_GEMINI_MODEL_OPTIONS } from "@/lib/moodie/model-options";
import { getMoodieProviderSnapshot } from "@/lib/moodie/providers/registry";
import { getMoodieVoiceSnapshot } from "@/lib/moodie/voice-config";
import { getOrCreateStudioInfo } from "@/lib/studio-info";
import {
  getMoodieGeminiSettingsSnapshot,
  getMoodieGeminiStoredApiKey,
} from "@/lib/system-settings";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type GoogleOAuth,
  type NotificationPreferences,
  type SettingsPageData,
  type StudioInfo,
  type StudioSettingsAdminData,
} from "@/types/settings";

function sanitizeStudioInfoForClient(studioInfo: StudioInfo): StudioInfo {
  const googleAuth = studioInfo.google_oauth as
    | (Partial<GoogleOAuth> & Record<string, unknown>)
    | null;

  return {
    ...studioInfo,
    google_oauth: googleAuth
      ? {
          access_token: "",
          refresh_token: "",
          expires_in:
            typeof googleAuth.expires_in === "number" ? googleAuth.expires_in : 0,
          granted_scopes: typeof googleAuth.granted_scopes === "string" ? googleAuth.granted_scopes : undefined,
          updated_at:
            typeof googleAuth.updated_at === "string"
              ? googleAuth.updated_at
              : studioInfo.updated_at || "",
        }
      : null,
  };
}

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

export async function getStudioInfoAdmin() {
  return withAdmin(async (adminClient) => {
    const [studioInfo, moodieAiSettings, moodieProviderSettings, moodieVoiceSettings] = await Promise.all([
      getOrCreateStudioInfo(adminClient),
      getMoodieGeminiSettingsSnapshot(adminClient),
      getMoodieProviderSnapshot(),
      getMoodieVoiceSnapshot(),
    ]);

    return {
      studioInfo: sanitizeStudioInfoForClient(studioInfo as StudioInfo),
      moodieAiSettings,
      moodieProviderSettings,
      moodieVoiceSettings,
    } satisfies StudioSettingsAdminData;
  });
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
  const context = await getAuthenticatedUserContext({ bootstrapProfile: true });

  if (!context) {
    throw new Error("Chưa đăng nhập");
  }

  if (!context.employee) {
    throw new Error("Không thể khởi tạo hồ sơ nhân viên");
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
