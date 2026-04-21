export const MOODIE_GEMINI_MODEL_AUTO = "auto";
export const DEFAULT_MOODIE_GEMINI_MODEL = "gemini-2.5-flash";

export type MoodieGeminiModelOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export const CURATED_MOODIE_GEMINI_MODEL_VALUES = [
  MOODIE_GEMINI_MODEL_AUTO,
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
] as const;

export const MOODIE_GEMINI_MODEL_VALUES = CURATED_MOODIE_GEMINI_MODEL_VALUES;

export const MOODIE_GEMINI_MODEL_OPTIONS = [
  {
    value: MOODIE_GEMINI_MODEL_VALUES[0],
    label: "Auto (khuyến nghị)",
  },
  {
    value: MOODIE_GEMINI_MODEL_VALUES[1],
    label: "Gemini 2.5 Flash",
  },
  {
    value: MOODIE_GEMINI_MODEL_VALUES[2],
    label: "Gemini 2.5 Flash-Lite",
  },
  {
    value: MOODIE_GEMINI_MODEL_VALUES[3],
    label: "Gemini 2.5 Pro",
  },
  {
    value: MOODIE_GEMINI_MODEL_VALUES[4],
    label: "Gemini 2.0 Flash (legacy)",
  },
] as const satisfies readonly MoodieGeminiModelOption[];

export type MoodieGeminiModelSetting =
  | (typeof CURATED_MOODIE_GEMINI_MODEL_VALUES)[number]
  | (string & {});

const GEMINI_MODEL_ID_PATTERN = /^gemini-[a-z0-9][a-z0-9.-]{1,120}[a-z0-9]$/i;

export function normalizeGeminiModelId(value: string | null | undefined) {
  return value?.trim().replace(/^models\//, "") || "";
}

export function isCuratedMoodieGeminiModelSetting(
  value: string | null | undefined,
): value is (typeof CURATED_MOODIE_GEMINI_MODEL_VALUES)[number] {
  return CURATED_MOODIE_GEMINI_MODEL_VALUES.includes(
    value as (typeof CURATED_MOODIE_GEMINI_MODEL_VALUES)[number],
  );
}

export function isMoodieGeminiModelId(value: string | null | undefined) {
  const normalized = normalizeGeminiModelId(value);
  return GEMINI_MODEL_ID_PATTERN.test(normalized);
}

export function isMoodieGeminiModelSetting(
  value: string | null | undefined,
): value is MoodieGeminiModelSetting {
  return (
    value === MOODIE_GEMINI_MODEL_AUTO ||
    isCuratedMoodieGeminiModelSetting(value) ||
    isMoodieGeminiModelId(value)
  );
}

export function normalizeMoodieGeminiModelSetting(
  value: string | null | undefined,
): MoodieGeminiModelSetting {
  const normalized = normalizeGeminiModelId(value);
  if (!normalized) return MOODIE_GEMINI_MODEL_AUTO;
  if (isMoodieGeminiModelSetting(normalized)) return normalized;
  return MOODIE_GEMINI_MODEL_AUTO;
}

export function resolveMoodieGeminiRuntimeModel(
  value: string | null | undefined,
): string {
  const model = normalizeMoodieGeminiModelSetting(value);
  return model === MOODIE_GEMINI_MODEL_AUTO
    ? DEFAULT_MOODIE_GEMINI_MODEL
    : model;
}

export function formatMoodieGeminiModelLabel(modelId: string) {
  if (modelId === MOODIE_GEMINI_MODEL_AUTO) return "Auto (khuyến nghị)";

  const normalized = normalizeGeminiModelId(modelId);
  if (!normalized) return "Gemini";

  const parts = normalized.split("-").filter(Boolean);
  return parts
    .map((part, index) => {
      if (index === 0 && part.toLowerCase() === "gemini") return "Gemini";
      if (/^\d+(\.\d+)?$/.test(part)) return part;
      if (["tts", "ui", "qa"].includes(part.toLowerCase())) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function mergeMoodieGeminiModelOptions(
  apiOptions: MoodieGeminiModelOption[],
) {
  const merged = new Map<string, MoodieGeminiModelOption>();

  for (const option of MOODIE_GEMINI_MODEL_OPTIONS) {
    merged.set(option.value, { ...option });
  }

  for (const option of apiOptions) {
    const value = normalizeGeminiModelId(option.value);
    if (!isMoodieGeminiModelId(value) || merged.has(value)) continue;

    merged.set(value, {
      value,
      label: option.label || formatMoodieGeminiModelLabel(value),
      disabled: option.disabled,
    });
  }

  return [...merged.values()];
}
