import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_MOODIE_GEMINI_MODEL,
  normalizeMoodieGeminiModelSetting,
  resolveMoodieGeminiRuntimeModel,
} from "@/lib/moodie/model-options";
import { decryptSecret } from "@/lib/settings-secrets";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { MoodieAiSettings } from "@/types/settings";

type AdminClient = SupabaseClient<Database>;
type SystemSettingRow = Database["public"]["Tables"]["system_settings"]["Row"];

export const MOODIE_GEMINI_API_KEY_SETTING_KEY = "moodie_gemini_api_key";
export const MOODIE_GEMINI_MODEL_SETTING_KEY = "moodie_gemini_model";

const LEGACY_GEMINI_API_KEY_SETTING_KEY = "gemini_api_key";
const LEGACY_GEMINI_MODEL_SETTING_KEY = "gemini_model";

const GEMINI_API_KEY_KEYS = [
  MOODIE_GEMINI_API_KEY_SETTING_KEY,
  LEGACY_GEMINI_API_KEY_SETTING_KEY,
] as const;

const GEMINI_MODEL_KEYS = [
  MOODIE_GEMINI_MODEL_SETTING_KEY,
  LEGACY_GEMINI_MODEL_SETTING_KEY,
] as const;

type SystemSettingsError = {
  code?: string;
  message?: string;
} | null | undefined;

function normalizeValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isMissingSystemSettingsTableError(error: SystemSettingsError) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function maskSecret(value: string | null | undefined) {
  const normalized = normalizeValue(value);
  if (!normalized) return "";
  if (normalized.length <= 4) return "*".repeat(normalized.length);
  return `********${normalized.slice(-4)}`;
}

function firstMatchingValue(
  rows: SystemSettingRow[],
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = normalizeValue(rows.find((row) => row.key === key)?.value);
    if (value) return decryptSecret(value);
  }

  return null;
}

async function selectSystemSettings(
  supabase: AdminClient,
  keys: readonly string[],
): Promise<SystemSettingRow[]> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("id, key, value, description, updated_at")
    .in("key", [...keys]);

  if (isMissingSystemSettingsTableError(error)) {
    return [];
  }

  if (error) {
    throw new Error(`Khong the tai system settings: ${error.message}`);
  }

  return (data || []) as SystemSettingRow[];
}

async function resolveMoodieGeminiSettings(supabase: AdminClient) {
  const rows = await selectSystemSettings(supabase, [
    ...GEMINI_API_KEY_KEYS,
    ...GEMINI_MODEL_KEYS,
  ]);

  const geminiApiKey = firstMatchingValue(rows, GEMINI_API_KEY_KEYS);
  const savedModel = firstMatchingValue(rows, GEMINI_MODEL_KEYS);
  const fallbackModel =
    normalizeValue(process.env.MOODIE_GEMINI_MODEL) ||
    normalizeValue(process.env.GEMINI_MODEL);
  const geminiModelSetting = normalizeMoodieGeminiModelSetting(savedModel);
  const geminiRuntimeModel = savedModel
    ? resolveMoodieGeminiRuntimeModel(savedModel)
    : fallbackModel || DEFAULT_MOODIE_GEMINI_MODEL;

  return {
    geminiApiKey,
    geminiModelSetting,
    geminiRuntimeModel,
  };
}

export async function getMoodieGeminiStoredApiKey(supabase: AdminClient) {
  const rows = await selectSystemSettings(supabase, GEMINI_API_KEY_KEYS);
  return firstMatchingValue(rows, GEMINI_API_KEY_KEYS);
}

export async function getMoodieGeminiSettingsSnapshot(
  supabase: AdminClient,
): Promise<MoodieAiSettings> {
  const settings = await resolveMoodieGeminiSettings(supabase);

  return {
    hasGeminiKey: Boolean(settings.geminiApiKey),
    geminiKeyMasked: maskSecret(settings.geminiApiKey),
    geminiModel: settings.geminiModelSetting,
  };
}

export async function getMoodieGeminiRuntimeConfig() {
  const supabase = await createAdminClient();
  const settings = await resolveMoodieGeminiSettings(supabase);

  const fallbackEnvKey =
    normalizeValue(process.env.MOODIE_GEMINI_API_KEY) ||
    normalizeValue(process.env.GOOGLE_AI_API_KEY) ||
    normalizeValue(process.env.GEMINI_API_KEY);

  const apiKey = settings.geminiApiKey || fallbackEnvKey;

  return {
    apiKey,
    model: settings.geminiRuntimeModel,
    source: settings.geminiApiKey ? "settings" : apiKey ? "env" : "none",
  } as const;
}
