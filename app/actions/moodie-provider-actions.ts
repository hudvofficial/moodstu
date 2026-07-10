"use server";

import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { withAdmin } from "@/lib/auth_utils";
import {
  MOODIE_PROVIDER_API_KEY_KEY,
  MOODIE_PROVIDER_BASE_URL_KEY,
  MOODIE_PROVIDER_EMBEDDING_MODEL_KEY,
  MOODIE_PROVIDER_ID_KEY,
  MOODIE_PROVIDER_LABEL_KEY,
  MOODIE_PROVIDER_MODEL_KEY,
  getActiveMoodieProvider,
  getMoodieProviderDisplayLabel,
  getMoodieProviderSnapshot,
} from "@/lib/moodie/providers/registry";
import {
  isValidProviderEmbeddingModel,
  isValidProviderModel,
  PROVIDER_PRESETS,
  type ProviderId,
} from "@/lib/moodie/providers/types";
import { encryptSecret } from "@/lib/settings-secrets";

export interface MoodieProviderFormData {
  provider_id: ProviderId;
  preset_id?: string;
  base_url?: string;
  api_key?: string;
  model: string;
  embedding_model?: string;
  label?: string;
}

export async function getMoodieProviderSettingsAction() {
  return withAdmin(async () => {
    return getMoodieProviderSnapshot();
  });
}

export async function testActiveMoodieProvider() {
  return withAdmin(async () => {
    const provider = await getActiveMoodieProvider();
    if (!provider) {
      return {
        ok: false as const,
        error: "Provider chưa sẵn sàng. Hãy kiểm tra API key và endpoint.",
      };
    }

    const startedAt = Date.now();
    const result = await provider.chat([
      {
        role: "system",
        content: "Bạn là phép kiểm tra kết nối. Chỉ trả lời đúng một từ: OK",
      },
      { role: "user", content: "ping" },
    ], []);

    if (!result.ok) {
      return { ok: false as const, error: result.error, latencyMs: Date.now() - startedAt };
    }

    return {
      ok: true as const,
      provider: provider.label,
      latencyMs: Date.now() - startedAt,
    };
  });
}

export async function saveMoodieProviderConfig(rawInput: unknown) {
  return withAdmin(async (adminClient) => {
    const data = rawInput as MoodieProviderFormData;
    const model = data.model?.trim() || "";
    const preset = data.preset_id
      ? PROVIDER_PRESETS.find((option) => option.id === data.preset_id)
      : undefined;

    if (!data.provider_id) {
      throw new Error("Thiếu provider_id");
    }

    if (!model) {
      throw new Error("Thiếu tên model");
    }

    if (data.preset_id && !preset) {
      throw new Error("Preset provider không hợp lệ");
    }

    if (preset && preset.providerId !== data.provider_id) {
      throw new Error("Preset provider không khớp với loại provider");
    }

    if (
      !isValidProviderModel({
        providerId: data.provider_id,
        presetId: data.preset_id,
        model,
      })
    ) {
      throw new Error("Model không hợp lệ cho provider đã chọn");
    }

    if (
      !isValidProviderEmbeddingModel({
        providerId: data.provider_id,
        presetId: data.preset_id,
        embeddingModel: data.embedding_model,
      })
    ) {
      throw new Error("Embedding model không hợp lệ cho provider đã chọn");
    }

    if (data.provider_id === "openai_compatible" && !data.base_url?.trim()) {
      throw new Error("Provider OpenAI-compatible cần có Base URL");
    }

    const now = new Date().toISOString();
    const updates: Array<{ key: string; value: string; description: string; updated_at: string }> = [];

    updates.push({
      key: MOODIE_PROVIDER_ID_KEY,
      value: data.provider_id,
      description: "Moodie LLM provider id",
      updated_at: now,
    });

    updates.push({
      key: MOODIE_PROVIDER_MODEL_KEY,
      value: model,
      description: "Moodie LLM model name",
      updated_at: now,
    });

    updates.push({
      key: MOODIE_PROVIDER_BASE_URL_KEY,
      value: data.base_url?.trim() || "",
      description: "Moodie OpenAI-compatible base URL",
      updated_at: now,
    });

    if (data.api_key?.trim()) {
      updates.push({
        key: MOODIE_PROVIDER_API_KEY_KEY,
        value: encryptSecret(data.api_key.trim()) ?? data.api_key.trim(),
        description: "Moodie provider API key (encrypted)",
        updated_at: now,
      });
    }

    updates.push({
      key: MOODIE_PROVIDER_EMBEDDING_MODEL_KEY,
      value: data.embedding_model?.trim() || "",
      description: "Moodie embedding model",
      updated_at: now,
    });

    updates.push({
      key: MOODIE_PROVIDER_LABEL_KEY,
      value: getMoodieProviderDisplayLabel(data.provider_id, data.label?.trim() || preset?.label),
      description: "Moodie provider display label",
      updated_at: now,
    });

    const { error } = await adminClient
      .from("system_settings")
      .upsert(updates, { onConflict: "key" });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        throw new Error("Bảng system_settings chưa có schema mới nhất");
      }
      throw new Error(`Lỗi lưu cấu hình provider: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "system_settings",
      recordId: MOODIE_PROVIDER_ID_KEY,
      description: `Cập nhật Moodie provider → ${data.provider_id} (${model})`,
      newData: {
        provider_id: data.provider_id,
        preset_id: data.preset_id,
        model,
        base_url: data.base_url,
      },
      source: "server_action",
    });

    revalidatePath("/settings");
    revalidatePath("/moodie");

    return { success: true, provider_id: data.provider_id, model };
  });
}
