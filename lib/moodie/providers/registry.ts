/**
 * registry.ts
 *
 * Provider registry cho Moodie.
 * Đọc config từ system_settings, instantiate đúng adapter.
 *
 * Backward-compatible: nếu chưa set provider_id mới,
 * tự fallback về Gemini dùng key cũ (moodie_gemini_api_key).
 */

import { createAdminClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/settings-secrets";
import { getMoodieGeminiRuntimeConfig } from "@/lib/system-settings";
import { GeminiAdapter } from "@/lib/moodie/providers/gemini-adapter";
import { OpenAIAdapter } from "@/lib/moodie/providers/openai-adapter";
import { PROVIDER_PRESETS } from "@/lib/moodie/providers/types";
import { discoverProviderModels } from "@/lib/moodie/providers/model-discovery";
import {
  normalizeProviderApiKey,
  normalizeProviderBaseUrl,
} from "@/lib/moodie/providers/config-policy";
import type { MoodieProvider, MoodieProviderConfig, ProviderId } from "@/lib/moodie/providers/types";

// ---------------------------------------------------------------------------
// Setting keys cho provider mới (lưu song song với Gemini keys cũ)
// ---------------------------------------------------------------------------

export const MOODIE_PROVIDER_ID_KEY = "moodie_provider_id";
export const MOODIE_PROVIDER_BASE_URL_KEY = "moodie_provider_base_url";
export const MOODIE_PROVIDER_API_KEY_KEY = "moodie_provider_api_key";
export const MOODIE_PROVIDER_MODEL_KEY = "moodie_provider_model";
export const MOODIE_PROVIDER_MODELS_KEY = "moodie_provider_models";
export const MOODIE_PROVIDER_EMBEDDING_MODEL_KEY = "moodie_provider_embedding_model";
export const MOODIE_PROVIDER_EMBEDDING_ENABLED_KEY = "moodie_provider_embedding_enabled";
export const MOODIE_PROVIDER_LABEL_KEY = "moodie_provider_label";

export function getMoodieProviderDisplayLabel(providerId: ProviderId, label?: string) {
  if (label && label !== providerId) return label;
  return providerId === "gemini" ? "Google Gemini" : "OpenAI-compatible gateway";
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createProvider(config: MoodieProviderConfig): MoodieProvider {
  switch (config.providerId) {
    case "openai_compatible":
      return new OpenAIAdapter(config);
    case "gemini":
    default:
      return new GeminiAdapter(config);
  }
}

// ---------------------------------------------------------------------------
// Config resolution (đọc từ DB system_settings)
// ---------------------------------------------------------------------------

export async function getMoodieProviderRuntimeConfig(): Promise<MoodieProviderConfig> {
  try {
    const supabase = await createAdminClient();

    const keys = [
      MOODIE_PROVIDER_ID_KEY,
      MOODIE_PROVIDER_BASE_URL_KEY,
      MOODIE_PROVIDER_API_KEY_KEY,
      MOODIE_PROVIDER_MODEL_KEY,
      MOODIE_PROVIDER_MODELS_KEY,
      MOODIE_PROVIDER_EMBEDDING_MODEL_KEY,
      MOODIE_PROVIDER_EMBEDDING_ENABLED_KEY,
      MOODIE_PROVIDER_LABEL_KEY,
    ];

    const { data } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", keys);

    const row = (key: string) =>
      (data || []).find((r) => r.key === key)?.value?.trim() || null;

    const providerId = row(MOODIE_PROVIDER_ID_KEY) as ProviderId | null;
    const availableModels = (() => {
      try {
        const parsed = JSON.parse(row(MOODIE_PROVIDER_MODELS_KEY) || "[]") as Array<{ value?: unknown; label?: unknown }>;
        return parsed
          .filter((option) => typeof option.value === "string" && typeof option.label === "string")
          .slice(0, 500) as Array<{ value: string; label: string }>;
      } catch {
        return [];
      }
    })();

    // Chưa từng cấu hình provider mới → giữ tương thích Gemini legacy.
    if (!providerId) {
      const geminiConfig = await getMoodieGeminiRuntimeConfig();
      return {
        providerId: "gemini",
        apiKey: geminiConfig.apiKey ?? undefined,
        model: geminiConfig.model,
      };
    }

    // Gemini đã được chọn trong provider mới: ưu tiên key/model mới. Chỉ
    // fallback về legacy khi bản ghi provider mới chưa có key (deployment cũ).
    if (providerId === "gemini") {
      const storedApiKey = normalizeProviderApiKey(decryptSecret(row(MOODIE_PROVIDER_API_KEY_KEY))) || undefined;
      const storedModel = row(MOODIE_PROVIDER_MODEL_KEY) ?? undefined;
      const storedEmbeddingModel = row(MOODIE_PROVIDER_EMBEDDING_MODEL_KEY) ?? undefined;
      const embeddingEnabledValue = row(MOODIE_PROVIDER_EMBEDDING_ENABLED_KEY);

      if (storedApiKey) {
        return {
          providerId: "gemini",
          apiKey: storedApiKey,
          model: storedModel || "gemini-2.5-flash",
          availableModels,
          embeddingModel: storedEmbeddingModel,
          embeddingEnabled: embeddingEnabledValue === null ? true : embeddingEnabledValue === "true",
          label: row(MOODIE_PROVIDER_LABEL_KEY) ?? "Google Gemini",
        };
      }

      const geminiConfig = await getMoodieGeminiRuntimeConfig();
      return {
        providerId: "gemini",
        apiKey: geminiConfig.apiKey ?? undefined,
        model: storedModel || geminiConfig.model,
        embeddingModel: storedEmbeddingModel,
        embeddingEnabled: embeddingEnabledValue === null ? true : embeddingEnabledValue === "true",
        label: row(MOODIE_PROVIDER_LABEL_KEY) ?? "Google Gemini",
      };
    }

    // OpenAI-compatible provider đã được set.
    const embeddingModel = row(MOODIE_PROVIDER_EMBEDDING_MODEL_KEY) ?? undefined;
    const embeddingEnabledValue = row(MOODIE_PROVIDER_EMBEDDING_ENABLED_KEY);

    return {
      providerId,
      baseUrl: row(MOODIE_PROVIDER_BASE_URL_KEY) ?? undefined,
      apiKey: normalizeProviderApiKey(decryptSecret(row(MOODIE_PROVIDER_API_KEY_KEY))) || undefined,
      model: row(MOODIE_PROVIDER_MODEL_KEY) ?? "gpt-4o-mini",
      availableModels,
      embeddingModel,
      embeddingEnabled: embeddingEnabledValue === null ? Boolean(embeddingModel) : embeddingEnabledValue === "true",
      label: row(MOODIE_PROVIDER_LABEL_KEY) ?? undefined,
    };
  } catch {
    // Fallback an toàn: thử Gemini env key
    const geminiEnvKey =
      process.env.MOODIE_GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      null;

    return {
      providerId: "gemini",
      apiKey: geminiEnvKey ?? undefined,
      model: process.env.MOODIE_GEMINI_MODEL || "gemini-2.5-flash",
    };
  }
}

// ---------------------------------------------------------------------------
// Public: lấy provider đang active
// ---------------------------------------------------------------------------

/**
 * Trả về MoodieProvider đang được cấu hình.
 * Nếu không có API key nào → trả null (moodie sẽ dùng core-engine fallback).
 */
export async function getActiveMoodieProvider(modelOverride?: string): Promise<MoodieProvider | null> {
  const config = await getMoodieProviderRuntimeConfig();

  // Không có key và không phải local (local thường không cần key)
  const needsKey = config.providerId === "gemini" || config.providerId === "openai_compatible";
  const isLocal = config.baseUrl?.includes("localhost") || config.baseUrl?.includes("127.0.0.1");

  if (needsKey && !config.apiKey && !isLocal) {
    return null;
  }

  return createProvider({
    ...config,
    model: modelOverride?.trim() || config.model,
    label: getMoodieProviderDisplayLabel(config.providerId, config.label),
  });
}

export async function getMoodieSelectableModels() {
  const config = await getMoodieProviderRuntimeConfig();
  const fallback = [{ value: config.model, label: config.model }];

  if (config.availableModels?.length) {
    return {
      selected: config.model,
      providerLabel: getMoodieProviderDisplayLabel(config.providerId, config.label),
      options: config.availableModels,
    };
  }

  try {
    const result = await discoverProviderModels({
      providerId: config.providerId,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey || "",
    });
    return {
      selected: config.model,
      providerLabel: getMoodieProviderDisplayLabel(config.providerId, config.label),
      options: result.models.length > 0 ? result.models : fallback,
    };
  } catch {
    return {
      selected: config.model,
      providerLabel: getMoodieProviderDisplayLabel(config.providerId, config.label),
      options: fallback,
    };
  }
}

/**
 * Trả về config hiện tại (dùng cho settings UI snapshot).
 */
export async function getMoodieProviderSnapshot(): Promise<{
  providerId: ProviderId;
  label: string;
  model: string;
  embeddingModel?: string;
  embeddingEnabled: boolean;
  hasKey: boolean;
  keyMasked?: string;
  baseUrl?: string;
  isLocal: boolean;
}> {
  const config = await getMoodieProviderRuntimeConfig();

  const isLocal = !!(config.baseUrl?.includes("localhost") || config.baseUrl?.includes("127.0.0.1"));

  return {
    providerId: config.providerId,
    label: getMoodieProviderDisplayLabel(config.providerId, config.label),
    model: config.model,
    embeddingModel: config.embeddingModel,
    embeddingEnabled: config.embeddingEnabled !== false,
    hasKey: !!(config.apiKey),
    keyMasked: config.apiKey ? `••••••••${config.apiKey.slice(-4)}` : undefined,
    baseUrl: config.baseUrl,
    isLocal,
  };
}

export function findMatchingMoodieProviderPreset(config: {
  providerId: ProviderId;
  baseUrl?: string;
  model: string;
  embeddingModel?: string;
}) {
  return (
    PROVIDER_PRESETS.find((preset) => {
      const sameProvider = preset.providerId === config.providerId;
      const sameBaseUrl = normalizeProviderBaseUrl(preset.baseUrl) === normalizeProviderBaseUrl(config.baseUrl);
      const sameModel = preset.model === config.model;
      return sameProvider && sameBaseUrl && sameModel;
    }) || null
  );
}
