import type { MoodieMessageMeta } from "@/types/moodie";

const MAX_STRING_LENGTH = 900;
const MAX_ARRAY_ITEMS = 8;
const MAX_OBJECT_KEYS = 24;
const MAX_JSON_LENGTH = 12_000;

function compactString(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_STRING_LENGTH) return normalized;
  return `${normalized.slice(0, 620).trimEnd()} ... [truncated] ... ${normalized.slice(-220).trimStart()}`;
}

function compactValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return compactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => compactValue(item, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push({ _truncated_items: value.length - MAX_ARRAY_ITEMS });
    }
    return items;
  }

  if (typeof value === "object") {
    if (depth >= 4) return "[nested object truncated]";

    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .slice(0, MAX_OBJECT_KEYS);
    const output = Object.fromEntries(entries.map(([key, entryValue]) => [key, compactValue(entryValue, depth + 1)]));
    const totalKeys = Object.keys(value as Record<string, unknown>).length;
    if (totalKeys > MAX_OBJECT_KEYS) {
      output._truncated_keys = totalKeys - MAX_OBJECT_KEYS;
    }
    return output;
  }

  return String(value);
}

function enforceJsonBudget(value: Record<string, unknown>) {
  const json = JSON.stringify(value);
  if (json.length <= MAX_JSON_LENGTH) return value;

  return {
    ...value,
    data: compactString(json.slice(0, MAX_JSON_LENGTH)),
    _normalized_note: "Tool output exceeded model budget; compact JSON preview only.",
  };
}

export function normalizeMoodieToolOutput(params: {
  toolName: string;
  result: Record<string, unknown>;
  metadata: Partial<MoodieMessageMeta>;
}) {
  const sources = params.metadata.sources?.slice(0, 6).map((source) => ({
    label: source.label,
    value: source.value,
    hint: source.hint,
  }));

  const normalized = enforceJsonBudget({
    tool: params.toolName,
    skill: params.metadata.skill_label || params.metadata.skill_id || "Moodie tool",
    sources,
    data: compactValue(params.result),
  });

  return JSON.stringify(normalized);
}
