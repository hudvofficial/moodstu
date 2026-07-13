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
import {
  DEFAULT_BRAVE_MAX_RESPONSE_BYTES,
  DEFAULT_BRAVE_SEARCH_ENDPOINT,
  DEFAULT_BRAVE_TIMEOUT_MS,
  MOODIE_BRAVE_API_KEY_KEY,
  MOODIE_BRAVE_ENABLED_KEY,
  MOODIE_BRAVE_ENDPOINT_KEY,
  MOODIE_BRAVE_MAX_BYTES_KEY,
  MOODIE_BRAVE_MCP_TOKEN_KEY,
  MOODIE_BRAVE_MCP_URL_KEY,
  MOODIE_BRAVE_TIMEOUT_KEY,
} from "@/lib/moodie/brave-config";
import { researchWithBrave } from "@/lib/moodie/mcp/adapters/brave";
import { encryptSecret } from "@/lib/settings-secrets";
import {
  DEFAULT_MOODIE_VOICE_STT_MODEL,
  getMoodieVoiceSnapshot,
  MOODIE_VOICE_API_KEY_KEY,
  MOODIE_VOICE_STT_MODEL_KEY,
} from "@/lib/moodie/voice-config";
import {
  DEFAULT_MOODIE_VOICE_ENGINE,
  DEFAULT_MOODIE_VOICE_LIVE_MODEL,
  DEFAULT_MOODIE_VOICE_LIVE_VOICE,
  getMoodieVoiceLiveConfig,
  MOODIE_VOICE_ENGINE_KEY,
  MOODIE_VOICE_LIVE_MODEL_KEY,
  MOODIE_VOICE_LIVE_VOICE_KEY,
  type MoodieVoiceEngine,
} from "@/lib/moodie/voice-live-config";

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

export interface MoodieVoiceFormData {
  api_key?: string;
  model?: string;
}

export async function getMoodieVoiceSettingsAction() {
  return withAdmin(async () => {
    const [voice, live] = await Promise.all([
      getMoodieVoiceSnapshot(),
      getMoodieVoiceLiveConfig(),
    ]);
    return {
      ...voice,
      engine: live.engine,
      liveVoice: live.voice,
      liveModel: live.model,
    };
  });
}

export interface MoodieVoiceLiveFormData {
  engine?: MoodieVoiceEngine;
  voice?: string;
  model?: string;
}

export async function saveMoodieVoiceLiveConfig(rawInput: unknown) {
  return withAdmin(async (adminClient) => {
    const data = rawInput as MoodieVoiceLiveFormData;
    const engine = data.engine === "cascade" ? "cascade" : DEFAULT_MOODIE_VOICE_ENGINE;
    const voice = data.voice?.trim() || DEFAULT_MOODIE_VOICE_LIVE_VOICE;
    const model = data.model?.trim() || DEFAULT_MOODIE_VOICE_LIVE_MODEL;
    const now = new Date().toISOString();
    const updates = [
      {
        key: MOODIE_VOICE_ENGINE_KEY,
        value: engine,
        description: "Moodie voice engine",
        updated_at: now,
      },
      {
        key: MOODIE_VOICE_LIVE_VOICE_KEY,
        value: voice,
        description: "Moodie Live prebuilt voice",
        updated_at: now,
      },
      {
        key: MOODIE_VOICE_LIVE_MODEL_KEY,
        value: model,
        description: "Moodie Live model",
        updated_at: now,
      },
    ];

    const { error } = await adminClient
      .from("system_settings")
      .upsert(updates, { onConflict: "key" });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        throw new Error("B\u1ea3ng system_settings ch\u01b0a c\u00f3 schema m\u1edbi nh\u1ea5t");
      }
      throw new Error(`L\u1ed7i l\u01b0u c\u1ea5u h\u00ecnh Live voice: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "system_settings",
      recordId: MOODIE_VOICE_ENGINE_KEY,
      description: `C\u1eadp nh\u1eadt Moodie Live voice (${engine}, ${voice}, ${model})`,
      newData: { engine, voice, model },
      source: "server_action",
    });

    revalidatePath("/settings");
    revalidatePath("/settings/studio");
    revalidatePath("/moodie");

    return { success: true, engine, voice, model };
  });
}

export interface MoodieBraveFormData {
  enabled: boolean;
  api_key?: string;
  endpoint?: string;
  mcp_url?: string;
  mcp_token?: string;
  timeout_ms?: number;
  max_response_bytes?: number;
}

export async function saveMoodieBraveConfig(rawInput: unknown) {
  return withAdmin(async (adminClient) => {
    const data = rawInput as MoodieBraveFormData;
    const endpoint = data.endpoint?.trim() || DEFAULT_BRAVE_SEARCH_ENDPOINT;
    const mcpUrl = data.mcp_url?.trim() || "";
    for (const value of [endpoint, mcpUrl].filter(Boolean)) {
      const url = new URL(value);
      if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
        throw new Error("Brave endpoint phải dùng HTTPS");
      }
    }
    const timeoutMs = Math.max(1_000, Math.min(Number(data.timeout_ms) || DEFAULT_BRAVE_TIMEOUT_MS, 60_000));
    const maxResponseBytes = Math.max(100_000, Math.min(Number(data.max_response_bytes) || DEFAULT_BRAVE_MAX_RESPONSE_BYTES, 5_000_000));
    const now = new Date().toISOString();
    const updates = [
      { key: MOODIE_BRAVE_ENABLED_KEY, value: String(Boolean(data.enabled)), description: "Enable Moodie Brave Search", updated_at: now },
      { key: MOODIE_BRAVE_ENDPOINT_KEY, value: endpoint, description: "Brave Search API endpoint", updated_at: now },
      { key: MOODIE_BRAVE_MCP_URL_KEY, value: mcpUrl, description: "Optional Brave MCP endpoint", updated_at: now },
      { key: MOODIE_BRAVE_TIMEOUT_KEY, value: String(timeoutMs), description: "Brave request timeout", updated_at: now },
      { key: MOODIE_BRAVE_MAX_BYTES_KEY, value: String(maxResponseBytes), description: "Brave maximum response bytes", updated_at: now },
    ];
    if (data.api_key?.trim()) updates.push({ key: MOODIE_BRAVE_API_KEY_KEY, value: encryptSecret(data.api_key.trim()) || data.api_key.trim(), description: "Brave Search API key (encrypted)", updated_at: now });
    if (data.mcp_token?.trim()) updates.push({ key: MOODIE_BRAVE_MCP_TOKEN_KEY, value: encryptSecret(data.mcp_token.trim()) || data.mcp_token.trim(), description: "Brave MCP token (encrypted)", updated_at: now });
    const { error } = await adminClient.from("system_settings").upsert(updates, { onConflict: "key" });
    if (error) throw new Error(`Lỗi lưu Brave Search: ${error.message}`);
    fireAuditLog({
      action: "UPDATE",
      tableName: "system_settings",
      recordId: MOODIE_BRAVE_ENABLED_KEY,
      description: "Cập nhật Brave Search cho Moodie",
      newData: { enabled: Boolean(data.enabled), endpoint, has_api_key_update: Boolean(data.api_key?.trim()), has_mcp_url: Boolean(mcpUrl) },
      source: "server_action",
    });
    revalidatePath("/settings/studio");
    revalidatePath("/moodie");
    return { success: true };
  });
}

export async function testMoodieBraveConnection() {
  return withAdmin(async () => {
    const startedAt = Date.now();
    try {
      const result = await researchWithBrave({ query: "Brave Search API", count: 3 });
      if (result.sources.length === 0) return { ok: false as const, error: result.warnings[0] || "Brave không trả về nguồn", latencyMs: Date.now() - startedAt };
      return { ok: true as const, sourceCount: result.sources.length, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Không thể kết nối Brave Search", latencyMs: Date.now() - startedAt };
    }
  });
}

export async function saveMoodieVoiceConfig(rawInput: unknown) {
  return withAdmin(async (adminClient) => {
    const data = rawInput as MoodieVoiceFormData;
    const model = data.model?.trim() || DEFAULT_MOODIE_VOICE_STT_MODEL;
    if (/(?:live|native-audio)/iu.test(model)) {
      throw new Error("Model STT phải hỗ trợ generateContent; không dùng model Live/Native Audio ở trường này");
    }

    const now = new Date().toISOString();
    const updates: Array<{ key: string; value: string; description: string; updated_at: string }> = [];

    updates.push({
      key: MOODIE_VOICE_STT_MODEL_KEY,
      value: model,
      description: "Moodie voice STT model",
      updated_at: now,
    });

    if (data.api_key?.trim()) {
      updates.push({
        key: MOODIE_VOICE_API_KEY_KEY,
        value: encryptSecret(data.api_key.trim()) ?? data.api_key.trim(),
        description: "Moodie voice Google API key (encrypted)",
        updated_at: now,
      });
    }

    const { error } = await adminClient
      .from("system_settings")
      .upsert(updates, { onConflict: "key" });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        throw new Error("Bảng system_settings chưa có schema mới nhất");
      }
      throw new Error(`Lỗi lưu cấu hình giọng nói: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "system_settings",
      recordId: MOODIE_VOICE_API_KEY_KEY,
      description: `Cập nhật Moodie voice config (${model})`,
      newData: { model, has_api_key: Boolean(data.api_key?.trim()) },
      source: "server_action",
    });

    revalidatePath("/settings");
    revalidatePath("/settings/studio");
    revalidatePath("/moodie");

    return { success: true, model };
  });
}
