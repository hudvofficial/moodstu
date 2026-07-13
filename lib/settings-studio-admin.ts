import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMoodieBraveSettingsSnapshot } from "@/lib/moodie/brave-config";
import { getMoodieBrowserSettingsSnapshot } from "@/lib/moodie/browser-config";
import { getMoodieProviderSnapshot } from "@/lib/moodie/providers/registry";
import { getMoodieVoiceSnapshot } from "@/lib/moodie/voice-config";
import { getMoodieVoiceLiveConfig } from "@/lib/moodie/voice-live-config";
import { getOrCreateStudioInfo } from "@/lib/studio-info";
import { getMoodieGeminiSettingsSnapshot } from "@/lib/system-settings";
import type { Database } from "@/types/database.types";
import type { GoogleOAuth, StudioInfo, StudioSettingsAdminData } from "@/types/settings";

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
          expires_in: typeof googleAuth.expires_in === "number" ? googleAuth.expires_in : 0,
          granted_scopes:
            typeof googleAuth.granted_scopes === "string"
              ? googleAuth.granted_scopes
              : undefined,
          updated_at:
            typeof googleAuth.updated_at === "string"
              ? googleAuth.updated_at
              : studioInfo.updated_at || "",
        }
      : null,
  };
}

export async function loadStudioSettingsAdminData(
  adminClient: SupabaseClient<Database>,
): Promise<StudioSettingsAdminData> {
  const [
    studioInfo,
    moodieAiSettings,
    moodieProviderSettings,
    moodieVoiceSettings,
    moodieVoiceLiveSettings,
    moodieBraveSettings,
    moodieBrowserSettings,
  ] = await Promise.all([
    getOrCreateStudioInfo(adminClient),
    getMoodieGeminiSettingsSnapshot(adminClient),
    getMoodieProviderSnapshot(),
    getMoodieVoiceSnapshot(),
    getMoodieVoiceLiveConfig(),
    getMoodieBraveSettingsSnapshot(),
    getMoodieBrowserSettingsSnapshot(),
  ]);

  return {
    studioInfo: sanitizeStudioInfoForClient(studioInfo as StudioInfo),
    moodieAiSettings,
    moodieProviderSettings,
    moodieVoiceSettings: {
      ...moodieVoiceSettings,
      engine: moodieVoiceLiveSettings.engine,
      liveVoice: moodieVoiceLiveSettings.voice,
      liveModel: moodieVoiceLiveSettings.model,
      realtimeProvider: moodieVoiceLiveSettings.provider,
      hasOpenAIKey: Boolean(moodieVoiceLiveSettings.openaiApiKey),
      openaiKeyMasked: moodieVoiceLiveSettings.openaiApiKey
        ? `••••••••${moodieVoiceLiveSettings.openaiApiKey.slice(-4)}`
        : undefined,
      openaiModel: moodieVoiceLiveSettings.openaiModel,
      openaiVoice: moodieVoiceLiveSettings.openaiVoice,
    },
    moodieBraveSettings,
    moodieBrowserSettings,
  };
}
