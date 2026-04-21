import {
  formatMoodieGeminiModelLabel,
  isCuratedMoodieGeminiModelSetting,
  isMoodieGeminiModelId,
  mergeMoodieGeminiModelOptions,
  MOODIE_GEMINI_MODEL_AUTO,
  normalizeGeminiModelId,
  type MoodieGeminiModelOption,
} from "@/lib/moodie/model-options";

const GEMINI_MODELS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GENERATE_CONTENT_METHOD = "generateContent";

type GeminiModelResource = {
  name?: string;
  baseModelId?: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
};

type GeminiModelsResponse = {
  models?: GeminiModelResource[];
  nextPageToken?: string;
  error?: {
    message?: string;
  };
};

function getGeminiModelId(model: GeminiModelResource) {
  return normalizeGeminiModelId(model.baseModelId || model.name);
}

function supportsGenerateContent(model: GeminiModelResource) {
  return (model.supportedGenerationMethods || []).includes(
    GENERATE_CONTENT_METHOD,
  );
}

function sortApiModelOptions(
  options: MoodieGeminiModelOption[],
): MoodieGeminiModelOption[] {
  return [...options].sort((left, right) =>
    left.label.localeCompare(right.label, "vi", { numeric: true }),
  );
}

async function fetchGeminiModelsPage(apiKey: string, pageToken?: string) {
  const url = new URL(GEMINI_MODELS_ENDPOINT);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("pageSize", "1000");

  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as GeminiModelsResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Gemini models API error (${response.status})`,
    );
  }

  return payload;
}

export async function fetchMoodieGeminiModelOptions(apiKey: string) {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) {
    throw new Error("Thiếu khóa API Gemini để tải danh sách model");
  }

  const modelMap = new Map<string, MoodieGeminiModelOption>();
  let pageToken: string | undefined;

  for (let page = 0; page < 10; page += 1) {
    const payload = await fetchGeminiModelsPage(normalizedKey, pageToken);

    for (const model of payload.models || []) {
      if (!supportsGenerateContent(model)) continue;

      const value = getGeminiModelId(model);
      if (!isMoodieGeminiModelId(value) || modelMap.has(value)) continue;

      modelMap.set(value, {
        value,
        label: model.displayName || formatMoodieGeminiModelLabel(value),
      });
    }

    pageToken = payload.nextPageToken;
    if (!pageToken) break;
  }

  return mergeMoodieGeminiModelOptions(
    sortApiModelOptions([...modelMap.values()]),
  );
}

export async function verifyMoodieGeminiModel(
  apiKey: string | null | undefined,
  model: string,
) {
  const normalizedModel = normalizeGeminiModelId(model);

  if (normalizedModel === MOODIE_GEMINI_MODEL_AUTO) return true;
  if (isCuratedMoodieGeminiModelSetting(normalizedModel)) return true;
  if (!isMoodieGeminiModelId(normalizedModel)) return false;

  const normalizedKey = apiKey?.trim();
  if (!normalizedKey) return false;

  const options = await fetchMoodieGeminiModelOptions(normalizedKey);
  return options.some((option) => option.value === normalizedModel);
}
