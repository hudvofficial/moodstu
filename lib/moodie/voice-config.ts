/**
 * voice-config.ts
 *
 * Config rieng cho Moodie voice (STT). Tach hoan toan khoi provider chat chinh:
 * luon di qua Google Gemini bat ke chat provider dang la gi.
 *
 * system_settings keys:
 * - moodie_voice_api_key      Google API key rieng cho voice (encrypted qua encryptSecret).
 * - moodie_voice_stt_model    Model STT, default "gemini-2.5-flash".
 *
 * Env fallback khi chua co setting: MOODIE_VOICE_GOOGLE_API_KEY.
 * KHONG fallback sang key chat chinh (moodie_provider_api_key / moodie_gemini_api_key).
 */

import { createAdminClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/settings-secrets";

export const MOODIE_VOICE_API_KEY_KEY = "moodie_voice_api_key";
export const MOODIE_VOICE_STT_MODEL_KEY = "moodie_voice_stt_model";

export const DEFAULT_MOODIE_VOICE_STT_MODEL = "gemini-2.5-flash";

export interface MoodieVoiceConfig {
  apiKey: string | null;
  model: string;
}

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Doc config voice tu system_settings, giai ma api key, fallback env khi thieu.
 * KHONG fallback sang key chat chinh cua Moodie.
 */
export async function getMoodieVoiceConfig(): Promise<MoodieVoiceConfig> {
  try {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [MOODIE_VOICE_API_KEY_KEY, MOODIE_VOICE_STT_MODEL_KEY]);

    const row = (key: string) =>
      normalize((data || []).find((item) => item.key === key)?.value);

    const storedKey = decryptSecret(row(MOODIE_VOICE_API_KEY_KEY));
    const envKey = normalize(process.env.MOODIE_VOICE_GOOGLE_API_KEY);
    const model = row(MOODIE_VOICE_STT_MODEL_KEY) || DEFAULT_MOODIE_VOICE_STT_MODEL;

    return {
      apiKey: storedKey || envKey,
      model,
    };
  } catch {
    return {
      apiKey: normalize(process.env.MOODIE_VOICE_GOOGLE_API_KEY),
      model: DEFAULT_MOODIE_VOICE_STT_MODEL,
    };
  }
}

/**
 * Snapshot cho settings UI (khong lo api key).
 */
export async function getMoodieVoiceSnapshot(): Promise<{
  hasKey: boolean;
  keyMasked?: string;
  model: string;
}> {
  const config = await getMoodieVoiceConfig();
  return {
    hasKey: Boolean(config.apiKey),
    keyMasked: config.apiKey ? `••••••••${config.apiKey.slice(-4)}` : undefined,
    model: config.model,
  };
}
