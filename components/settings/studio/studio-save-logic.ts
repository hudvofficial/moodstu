import {
  updateMoodieAiSettings,
  updateStudioInfo,
} from "@/app/actions/settings-mutations";
import { cacheKeys, mutate } from "@/lib/swr";
import type {
  BankInfo,
  MoodieAiSettings,
  SocialLinks,
  StudioInfo,
  WorkingHours,
} from "@/types/settings";

export type SaveResult = {
  section: string;
  success: boolean;
  error?: string;
};

interface StudioSavePayload {
  name: string;
  hotline: string;
  address: string | null;
  representative: string | null;
  logo_url: string | null;
  timezone: string;
  bank_info: BankInfo;
  social_links: SocialLinks;
  working_hours: WorkingHours;
  expected_updated_at: string | null;
}

interface StudioSaveContext {
  hasStudioChanges: boolean;
  hasMoodieChanges: boolean;
  studioPayload: StudioSavePayload;
  moodieApiKeyInput: string;
  moodieGeminiModel: string;
  savedMoodieSettings: MoodieAiSettings;
  setSavedStudioInfo: (fn: (prev: StudioInfo) => StudioInfo) => void;
  setSavedMoodieSettings: (fn: (prev: MoodieAiSettings) => MoodieAiSettings) => void;
}

async function executeStudioSave(
  payload: StudioSavePayload,
  setSavedStudioInfo: StudioSaveContext["setSavedStudioInfo"],
): Promise<SaveResult> {
  const result = await updateStudioInfo(payload as unknown as Record<string, unknown>);
  if (!result.success) {
    return { section: "Thông tin studio", success: false, error: result.error || "Lỗi cập nhật" };
  }
  const publicStudioInfo = { ...result.data, google_oauth: null };
  setSavedStudioInfo(() => result.data);
  void mutate(cacheKeys.studioInfo(), publicStudioInfo, { revalidate: false });
  void mutate(cacheKeys.settings(), publicStudioInfo, { revalidate: false });
  return { section: "Studio", success: true };
}

async function executeMoodieSave(
  ctx: Pick<StudioSaveContext, "moodieApiKeyInput" | "moodieGeminiModel" | "savedMoodieSettings" | "setSavedMoodieSettings">,
): Promise<SaveResult> {
  const nextModel = ctx.moodieGeminiModel.trim();
  const result = await updateMoodieAiSettings({
    gemini_api_key: ctx.moodieApiKeyInput.trim() || undefined,
    gemini_model:
      nextModel && nextModel !== ctx.savedMoodieSettings.geminiModel
        ? nextModel
        : undefined,
  });

  if (!result.success) {
    return { section: "Moodie AI", success: false, error: result.error || "Lỗi cập nhật" };
  }

  ctx.setSavedMoodieSettings((current) => ({
    ...current,
    hasGeminiKey: current.hasGeminiKey || ctx.moodieApiKeyInput.trim().length > 0,
    geminiModel: nextModel || current.geminiModel,
  }));

  return { section: "Moodie AI", success: true };
}

/**
 * Execute all save tasks in parallel when both are needed.
 * Returns array of results and the first failure (if any).
 */
export async function executeSaveTasks(ctx: StudioSaveContext): Promise<{
  results: SaveResult[];
  failed: SaveResult | undefined;
}> {
  const tasks: Array<Promise<SaveResult>> = [];

  if (ctx.hasStudioChanges) {
    tasks.push(executeStudioSave(ctx.studioPayload, ctx.setSavedStudioInfo));
  }

  if (ctx.hasMoodieChanges) {
    tasks.push(executeMoodieSave(ctx));
  }

  // Run in parallel — both tasks are independent
  const results = await Promise.all(tasks);
  const failed = results.find((r) => !r.success);

  return { results, failed };
}
