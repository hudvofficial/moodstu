import type { Json } from "@/types/database.types";
import type {
  MoodieConversationDetail,
  MoodieConversationSummary,
  MoodieMessage,
  MoodieMessageMeta,
  MoodieMessageRole,
  MoodieWidget,
  MoodieWidgetTone,
} from "@/types/moodie";

type ConversationRow = {
  id: string;
  title: string | null;
  last_message_preview: string | null;
  created_at: string | null;
  updated_at: string | null;
  locked_until: string | null;
  locked_by: string | null;
  version: number | null;
};

type MessageRow = {
  id: string;
  role: string | null;
  content: string | null;
  metadata: Json | null;
  created_at: string | null;
};

function isObject(value: Json | null): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: Json | undefined) {
  return typeof value === "string" ? value : undefined;
}

function toNumberValue(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toToneValue(value: Json | undefined): MoodieWidgetTone | undefined {
  return value === "default" || value === "positive" || value === "warning" || value === "danger"
    ? value
    : undefined;
}

function parseMoodieWidgets(value: Json | undefined): MoodieWidget[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const widgets = value
    .map((widget): MoodieWidget | null => {
      if (!isObject(widget)) return null;

      const title = toStringValue(widget.title);
      const type = toStringValue(widget.type);
      const items = Array.isArray(widget.items) ? widget.items.filter(isObject) : [];

      if (type === "kpi_cards") {
        const parsedItems = items
          .map((item) => ({
            label: toStringValue(item.label) || "",
            value: toStringValue(item.value) || "",
            hint: toStringValue(item.hint),
            tone: toToneValue(item.tone),
          }))
          .filter((item) => item.label && item.value);

        return parsedItems.length > 0
          ? {
              type,
              title,
              items: parsedItems,
            }
          : null;
      }

      if (type === "progress_bars") {
        const parsedItems = items
          .map((item) => {
            const current = toNumberValue(item.current);
            const target = toNumberValue(item.target);
            return {
              label: toStringValue(item.label) || "",
              current,
              target,
              unit: toStringValue(item.unit),
              hint: toStringValue(item.hint),
              tone: toToneValue(item.tone),
            };
          })
          .filter((item) => item.label && item.current !== undefined && item.target !== undefined);

        return parsedItems.length > 0
          ? {
              type,
              title,
              items: parsedItems.map((item) => ({
                ...item,
                current: item.current as number,
                target: item.target as number,
              })),
            }
          : null;
      }

      if (type === "comparison_bars") {
        const parsedItems = items
          .map((item) => {
            const valueNumber = toNumberValue(item.value);
            return {
              label: toStringValue(item.label) || "",
              value: valueNumber,
              value_label: toStringValue(item.value_label),
              secondary_value: toNumberValue(item.secondary_value),
              secondary_label: toStringValue(item.secondary_label),
              hint: toStringValue(item.hint),
              tone: toToneValue(item.tone),
            };
          })
          .filter((item) => item.label && item.value !== undefined);

        return parsedItems.length > 0
          ? {
              type,
              title,
              items: parsedItems.map((item) => ({
                ...item,
                value: item.value as number,
              })),
            }
          : null;
      }

      return null;
    })
    .filter((widget): widget is MoodieWidget => widget !== null);

  return widgets.length > 0 ? widgets : undefined;
}

export function excerptText(value: string | null | undefined, max = 96) {
  const text = (value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function deriveConversationTitleFromPrompt(prompt: string) {
  return excerptText(prompt, 72) || "Cuộc trò chuyện mới";
}

export function parseMoodieMessageMeta(value: Json | null): MoodieMessageMeta | null {
  if (!isObject(value)) return null;

  const provider = typeof value.provider === "string" ? value.provider : null;
  if (!provider) return null;

  const sources = Array.isArray(value.sources)
    ? value.sources
        .filter((item): item is Record<string, Json | undefined> => typeof item === "object" && item !== null && !Array.isArray(item))
        .map((item) => ({
          label: typeof item.label === "string" ? item.label : "",
          value: typeof item.value === "string" ? item.value : undefined,
          hint: typeof item.hint === "string" ? item.hint : undefined,
        }))
        .filter((item) => item.label)
    : undefined;

  const followUps = Array.isArray(value.follow_ups)
    ? value.follow_ups.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;

  return {
    provider,
    skill_id: typeof value.skill_id === "string" ? (value.skill_id as MoodieMessageMeta["skill_id"]) : undefined,
    skill_label: typeof value.skill_label === "string" ? value.skill_label : undefined,
    note: typeof value.note === "string" ? value.note : null,
    follow_ups: followUps,
    sources,
    widgets: parseMoodieWidgets(value.widgets),
  };
}

export function mapMoodieMessage(row: MessageRow): MoodieMessage {
  const role = row.role === "assistant" ? "assistant" : "user";

  return {
    id: row.id,
    role: role as MoodieMessageRole,
    content: row.content || "",
    metadata: parseMoodieMessageMeta(row.metadata),
    created_at: row.created_at || new Date().toISOString(),
  };
}

export function mapMoodieConversationSummary(
  row: ConversationRow,
  messageCount: number,
): MoodieConversationSummary {
  return {
    id: row.id,
    title: row.title?.trim() || "Cuộc trò chuyện mới",
    last_message_preview: row.last_message_preview || null,
    message_count: messageCount,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    locked_until: row.locked_until,
    locked_by: row.locked_by,
    version: row.version || 1,
  };
}

export function mapMoodieConversationDetail(
  row: ConversationRow,
  messageCount: number,
  messages: MessageRow[],
): MoodieConversationDetail {
  return {
    ...mapMoodieConversationSummary(row, messageCount),
    messages: messages.map(mapMoodieMessage),
  };
}

export function sortMoodieConversations<T extends { updated_at: string; created_at: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right.updated_at || right.created_at).getTime();
    const leftTime = new Date(left.updated_at || left.created_at).getTime();
    return rightTime - leftTime;
  });
}
