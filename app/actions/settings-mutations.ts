"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { withAdmin } from "@/lib/auth_utils";
import { getValidGoogleToken } from "@/lib/google-auth";
import { listGoogleCalendarSources, validateGoogleCalendarSelection } from "@/lib/google-calendar-sources";
import { writeAuditLog } from "@/lib/audit";
import { verifyMoodieGeminiModel } from "@/lib/moodie/gemini-models";
import { isCuratedMoodieGeminiModelSetting } from "@/lib/moodie/model-options";
import { decryptGoogleOAuth, encryptSecret, redactGoogleOAuth } from "@/lib/settings-secrets";
import { getOrCreateStudioInfo } from "@/lib/studio-info";
import {
  getMoodieGeminiStoredApiKey,
  MOODIE_GEMINI_API_KEY_SETTING_KEY,
  MOODIE_GEMINI_MODEL_SETTING_KEY,
} from "@/lib/system-settings";
import {
  moodieAiSettingsSchema,
  studioInfoSchema,
} from "@/lib/validations/settings.schema";
import type { StudioInfo } from "@/types/settings";

function maskLastFour(value: string) {
  return value.length >= 4 ? `...${value.slice(-4)}` : "****";
}

function getImageExtension(file: File) {
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByType[file.type] || "jpg";
}

export async function updateStudioInfo(rawData: Record<string, unknown>) {
  return withAdmin(async (adminClient) => {
    const parsed = studioInfoSchema.safeParse(rawData);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");
    }

    const { expected_updated_at, ...updateFields } = parsed.data;
    const oldData = await getOrCreateStudioInfo(adminClient);

    let query = adminClient
      .from("studio_info")
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", oldData.id);

    if (expected_updated_at) {
      query = query.eq("updated_at", expected_updated_at);
    }

    const { data: updated, error } = await query.select("*").maybeSingle();

    if (error || !updated) {
      if (!updated && (!error || error.code === "PGRST116")) {
        throw new Error(
          "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.",
        );
      }

      throw new Error(
        `Lỗi cập nhật studio: ${error?.message || "Không xác định"}`,
      );
    }

    await writeAuditLog({
      action: "UPDATE",
      tableName: "studio_info",
      recordId: updated.id,
      oldData: oldData as Record<string, unknown>,
      newData: updated as Record<string, unknown>,
      description: `Cập nhật thông tin studio: ${updateFields.name}`,
      source: "server_action",
    });

    revalidatePath("/settings");
    revalidatePath("/settings/studio");
    return updated as StudioInfo;
  });
}

export async function uploadStudioLogo(formData: FormData) {
  return withAdmin(async (adminClient) => {
    const file = (formData.get("logo") || formData.get("file")) as File | null;

    if (!file || file.size === 0) {
      throw new Error("Chưa chọn logo");
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Logo không được vượt quá 2MB");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Chỉ chấp nhận logo JPG, PNG hoặc WEBP");
    }

    const studio = await getOrCreateStudioInfo(adminClient);
    const extension = getImageExtension(file);
    const filePath = `${studio.id}/logo.${extension}`;
    const { error: uploadError } = await adminClient.storage
      .from("studio-assets")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`Lỗi tải logo: ${uploadError.message}`);
    }

    const { data: urlData } = adminClient.storage
      .from("studio-assets")
      .getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "studio_info",
      recordId: studio.id,
      description: "Tải logo studio",
      newData: { logo_url: publicUrl },
      source: "server_action",
    });

    return { url: publicUrl };
  });
}

export async function updateMoodieAiSettings(rawData: Record<string, unknown>) {
  return withAdmin(async (adminClient) => {
    const normalizedPayload = {
      gemini_api_key:
        typeof rawData.gemini_api_key === "string" &&
        rawData.gemini_api_key.trim().length > 0
          ? rawData.gemini_api_key.trim()
          : undefined,
      gemini_model:
        typeof rawData.gemini_model === "string" &&
        rawData.gemini_model.trim().length > 0
          ? rawData.gemini_model.trim()
          : undefined,
    };

    const parsed = moodieAiSettingsSchema.safeParse(normalizedPayload);
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message || "Dữ liệu AI không hợp lệ",
      );
    }

    if (
      parsed.data.gemini_model &&
      !isCuratedMoodieGeminiModelSetting(parsed.data.gemini_model)
    ) {
      const apiKeyForVerification =
        parsed.data.gemini_api_key ||
        (await getMoodieGeminiStoredApiKey(adminClient)) ||
        process.env.MOODIE_GEMINI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GEMINI_API_KEY;
      const isValidModel = await verifyMoodieGeminiModel(
        apiKeyForVerification,
        parsed.data.gemini_model,
      );

      if (!isValidModel) {
        throw new Error(
          "Mô hình Gemini này không có trong API hoặc không hỗ trợ generateContent",
        );
      }
    }

    const updates: Array<{
      key: string;
      value: string | null;
      description: string;
      updated_at: string;
    }> = [];
    const auditData: Record<string, unknown> = {};
    const now = new Date().toISOString();

    if (parsed.data.gemini_api_key) {
      updates.push({
        key: MOODIE_GEMINI_API_KEY_SETTING_KEY,
        value: encryptSecret(parsed.data.gemini_api_key),
        description: "Gemini API key for Moodie runtime",
        updated_at: now,
      });
      auditData.gemini_api_key = maskLastFour(parsed.data.gemini_api_key);
    }

    if (parsed.data.gemini_model) {
      updates.push({
        key: MOODIE_GEMINI_MODEL_SETTING_KEY,
        value: parsed.data.gemini_model,
        description: "Gemini model for Moodie runtime",
        updated_at: now,
      });
      auditData.gemini_model = parsed.data.gemini_model;
    }

    const { error } = await adminClient
      .from("system_settings")
      .upsert(updates, { onConflict: "key" });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        throw new Error("Bảng system_settings chưa được cập nhật schema");
      }
      throw new Error(`Lỗi cập nhật cấu hình Moodie AI: ${error.message}`);
    }

    await writeAuditLog({
      action: "UPDATE",
      tableName: "system_settings",
      recordId: MOODIE_GEMINI_API_KEY_SETTING_KEY,
      description: "Cập nhật cấu hình Moodie Gemini",
      newData: auditData,
      source: "server_action",
    });

    revalidatePath("/settings");
    revalidatePath("/settings/studio");
    revalidatePath("/moodie");
    return null;
  });
}

export async function disconnectGoogleOAuth() {
  return withAdmin(async (adminClient) => {
    const studio = await getOrCreateStudioInfo(adminClient);

    const { error } = await adminClient
      .from("studio_info")
      .update({
        google_oauth: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studio.id);

    if (error) throw new Error(`Lỗi ngắt kết nối: ${error.message}`);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "studio_info",
      recordId: studio.id,
      description: "Ngắt kết nối Google (Calendar + Drive)",
      oldData: { google_oauth: redactGoogleOAuth(studio.google_oauth) },
      newData: { google_oauth: null },
      source: "server_action",
    });

    revalidatePath("/settings");
    revalidatePath("/settings/studio");
    revalidateTag("studio-info", { expire: 0 });
    return null;
  });
}

/**
 * Set which of the connected account's readable Google calendars appear in
 * Mood Studio. This never changes Google Calendar visibility/settings or
 * writes events. IDs are validated against Google, not trusted from the client.
 */
export async function updateGoogleCalendarSourceSelection(calendarIds: string[]) {
  return withAdmin(async (adminClient) => {
    const { data: studio, error: studioError } = await adminClient
      .from("studio_info")
      .select("id, google_oauth")
      .limit(1)
      .maybeSingle();
    if (studioError || !studio?.google_oauth) {
      throw new Error("Studio chưa kết nối Google Calendar.");
    }

    const token = await getValidGoogleToken(adminClient, studio);
    const sources = await listGoogleCalendarSources(token.access_token);
    const verifiedIds = validateGoogleCalendarSelection(sources, calendarIds);

    // Refreshing an access token may update the stored OAuth JSON. Reload
    // before mutating preferences so we don't restore an expired token.
    const { data: latest, error: latestError } = await adminClient
      .from("studio_info")
      .select("google_oauth")
      .eq("id", studio.id)
      .maybeSingle();
    if (latestError || !latest?.google_oauth) {
      throw new Error("Kết nối Google đã thay đổi. Vui lòng tải lại trang.");
    }
    const currentAuth = latest.google_oauth as Record<string, unknown>;
    // AES-GCM uses a new IV on every refresh: ciphertext comparisons would
    // falsely reject legitimate token refreshes. Compare only in memory.
    const originalRefreshToken = decryptGoogleOAuth(studio.google_oauth)?.refresh_token;
    const currentRefreshToken = decryptGoogleOAuth(latest.google_oauth)?.refresh_token;
    if (
      typeof originalRefreshToken !== "string" ||
      !originalRefreshToken ||
      originalRefreshToken !== currentRefreshToken
    ) {
      throw new Error("Kết nối Google vừa thay đổi. Hãy tải lại nguồn lịch.");
    }

    const previousIds = currentAuth.selected_calendar_ids;
    const { error: updateError } = await adminClient
      .from("studio_info")
      .update({
        google_oauth: {
          ...currentAuth,
          selected_calendar_ids: verifiedIds,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", studio.id);
    if (updateError) throw new Error("Không thể lưu nguồn lịch Google.");

    await writeAuditLog({
      action: "UPDATE",
      tableName: "studio_info",
      recordId: studio.id,
      description: "Cập nhật nguồn lịch Google hiển thị trong Mood Studio",
      oldData: {
        google_calendar_source_count: Array.isArray(previousIds) ? previousIds.length : null,
      },
      newData: { google_calendar_source_count: verifiedIds.length },
      source: "server_action",
    });

    revalidatePath("/settings/studio");
    revalidatePath("/calendar");
    revalidateTag("studio-info", { expire: 0 });
    return { count: verifiedIds.length };
  });
}
