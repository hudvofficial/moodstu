import type { Json } from "@/types/database.types";
import type {
  MoodieConversationDetail,
  MoodieConversationSummary,
  MoodieActionPreview,
  MoodieMessage,
  MoodieBackgroundRunRef,
  MoodieMessageMeta,
  MoodieMessageSource,
  MoodieMessageRole,
  MoodieTrace,
  MoodieWidget,
  MoodieWidgetTone,
} from "@/types/moodie";
import { parseMoodieMessageParts, widgetsToMoodieParts } from "@/lib/moodie/message-parts";

type ConversationRow = {
  id: string;
  title: string | null;
  last_message_preview: string | null;
  created_at: string | null;
  updated_at: string | null;
  locked_until: string | null;
  locked_by: string | null;
  message_count?: number | null;
  version: number | null;
  active_leaf_message_id?: string | null;
};

type MessageRow = {
  id: string;
  role: string | null;
  content: string | null;
  metadata: Json | null;
  parent_message_id?: string | null;
  revision?: number | null;
  status?: string | null;
  request_id?: string | null;
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

function parseMoodieActions(value: Json | undefined): MoodieActionPreview[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const actions = value.flatMap((item) => {
    if (!isObject(item)) return [];
    const kind = item.kind as MoodieActionPreview["kind"];
    if (kind !== "navigate" && kind !== "sync_drive_gallery" && kind !== "refresh_gallery_share" && kind !== "sync_google_calendar") return [];
    const id = toStringValue(item.id);
    const label = toStringValue(item.label);
    const href = toStringValue(item.href);
    const description = toStringValue(item.description);
    const targetId = toStringValue(item.target_id);
    const conversationId = toStringValue(item.conversation_id);
    if (!id || !label || !description) return [];
    if (kind === "navigate" && (!href || !href.startsWith("/"))) return [];
    if (kind !== "navigate" && !targetId) return [];

    const risk: MoodieActionPreview["risk"] =
      item.risk === "low" || item.risk === "medium" || item.risk === "high"
        ? item.risk
        : "none";

    return [{
      id,
      kind,
      label,
      href: href || undefined,
      target_id: targetId || undefined,
      conversation_id: conversationId || undefined,
      description,
      risk,
      requires_approval: typeof item.requires_approval === "boolean" ? item.requires_approval : false,
    }];
  });

  return actions.length > 0 ? actions : undefined;
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
        .map((item): MoodieMessageSource => ({
          label: typeof item.label === "string" ? item.label : "",
          value: typeof item.value === "string" ? item.value : undefined,
          hint: typeof item.hint === "string" ? item.hint : undefined,
          kind: item.kind === "web" || item.kind === "document" || item.kind === "internal" || item.kind === "database" ? item.kind : undefined,
          entity_type: typeof item.entity_type === "string" ? item.entity_type : undefined,
          entity_id: typeof item.entity_id === "string" ? item.entity_id : undefined,
          href: typeof item.href === "string" ? item.href : undefined,
          metadata: isObject(item.metadata ?? null) ? item.metadata as Record<string, Json> : undefined,
        }))
        .filter((item) => item.label)
    : undefined;

  const backgroundRuns = Array.isArray(value.background_runs)
    ? value.background_runs
        .filter((item): item is Record<string, Json | undefined> => typeof item === "object" && item !== null && !Array.isArray(item))
        .flatMap((item): MoodieBackgroundRunRef[] => typeof item.id === "string" && typeof item.title === "string" && typeof item.status === "string"
          ? [{ id: item.id, title: item.title, status: item.status, kind: item.kind === "task" || item.kind === "action" ? item.kind : "research" }]
          : [])
    : undefined;

  const attachments = Array.isArray(value.attachments)
    ? value.attachments
        .filter((item): item is Record<string, Json | undefined> => typeof item === "object" && item !== null && !Array.isArray(item))
        .flatMap((item) => typeof item.id === "string" && typeof item.name === "string" && typeof item.mime_type === "string" && typeof item.size === "number" && typeof item.storage_path === "string"
          ? [{ id: item.id, name: item.name, mime_type: item.mime_type, size: item.size, storage_path: item.storage_path }]
          : [])
    : undefined;

  const contexts = Array.isArray(value.contexts)
    ? value.contexts
        .filter((item): item is Record<string, Json | undefined> => typeof item === "object" && item !== null && !Array.isArray(item))
        .flatMap((item) => typeof item.id === "string" && typeof item.type === "string" && typeof item.label === "string"
          ? [{ id: item.id, type: item.type as "capability" | "contract" | "customer" | "calendar" | "gallery" | "reporting_period", label: item.label, value: typeof item.value === "string" ? item.value : undefined }]
          : [])
    : undefined;

  const followUps = Array.isArray(value.follow_ups)
    ? value.follow_ups.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;

  const traceValue: Record<string, Json | undefined> | null = isObject(value.trace ?? null) ? (value.trace as Record<string, Json | undefined>) : null;

  const trace: MoodieTrace | undefined = traceValue
    ? {
        engine: traceValue.engine === "core_fallback" ? "core_fallback" : "model",
        started_at: typeof traceValue.started_at === "string" ? traceValue.started_at : new Date().toISOString(),
        duration_ms: typeof traceValue.duration_ms === "number" ? traceValue.duration_ms : 0,
        provider: typeof traceValue.provider === "string" ? traceValue.provider : undefined,
        agent_id: typeof traceValue.agent_id === "string" ? traceValue.agent_id : undefined,
        route_intent: typeof traceValue.route_intent === "string" ? traceValue.route_intent : undefined,
        route_reason: typeof traceValue.route_reason === "string" ? traceValue.route_reason : undefined,
        retrieval_used: typeof traceValue.retrieval_used === "boolean" ? traceValue.retrieval_used : undefined,
        research_required: typeof traceValue.research_required === "boolean" ? traceValue.research_required : undefined,
        research_mode: traceValue.research_mode === "news" || traceValue.research_mode === "local" ? traceValue.research_mode : traceValue.research_mode === "web" ? "web" : undefined,
        allowed_tool_names: Array.isArray(traceValue.allowed_tool_names) ? traceValue.allowed_tool_names.filter((item): item is string => typeof item === "string") : undefined,
        execution_plan: typeof traceValue.execution_plan === "string" ? traceValue.execution_plan : undefined,
        model_steps: typeof traceValue.model_steps === "number" ? traceValue.model_steps : 0,
        tool_call_count: typeof traceValue.tool_call_count === "number" ? traceValue.tool_call_count : 0,
        verifier_corrections: typeof traceValue.verifier_corrections === "number" ? traceValue.verifier_corrections : 0,
        fallback_used: typeof traceValue.fallback_used === "boolean" ? traceValue.fallback_used : false,
        fallback_reason: traceValue.fallback_reason === "provider_error" ? "provider_error" : traceValue.fallback_reason === "provider_unavailable" ? "provider_unavailable" : undefined,
        provider_latency_ms: typeof traceValue.provider_latency_ms === "number" ? traceValue.provider_latency_ms : undefined,
        fallback_latency_ms: typeof traceValue.fallback_latency_ms === "number" ? traceValue.fallback_latency_ms : undefined,
        input_tokens: typeof traceValue.input_tokens === "number" ? traceValue.input_tokens : undefined,
        output_tokens: typeof traceValue.output_tokens === "number" ? traceValue.output_tokens : undefined,
        total_tokens: typeof traceValue.total_tokens === "number" ? traceValue.total_tokens : undefined,
        tools: Array.isArray(traceValue.tools)
          ? traceValue.tools
              .filter((item): item is Record<string, Json | undefined> => typeof item === "object" && item !== null && !Array.isArray(item))
              .map((item) => ({
                name: typeof item.name === "string" ? item.name : "unknown",
                ok: typeof item.ok === "boolean" ? item.ok : false,
                duration_ms: typeof item.duration_ms === "number" ? item.duration_ms : 0,
                result_bytes: typeof item.result_bytes === "number" ? item.result_bytes : undefined,
                error: typeof item.error === "string" ? item.error : undefined,
              }))
          : [],
        error: typeof traceValue.error === "string" ? traceValue.error : undefined,
      }
    : undefined;

  const widgets = parseMoodieWidgets(value.widgets);
  return {
    provider,
    response_ui_version: value.response_ui_version === 2 ? 2 : undefined,
    background_runs: backgroundRuns,
    agent_id: typeof value.agent_id === "string" ? value.agent_id : undefined,
    agent_label: typeof value.agent_label === "string" ? value.agent_label : undefined,
    skill_id: typeof value.skill_id === "string" ? (value.skill_id as MoodieMessageMeta["skill_id"]) : undefined,
    skill_label: typeof value.skill_label === "string" ? value.skill_label : undefined,
    note: typeof value.note === "string" ? value.note : null,
    route_intent: typeof value.route_intent === "string" ? value.route_intent : undefined,
    route_reason: typeof value.route_reason === "string" ? value.route_reason : undefined,
    retrieval_used: typeof value.retrieval_used === "boolean" ? value.retrieval_used : undefined,
    execution_plan: typeof value.execution_plan === "string" ? value.execution_plan : undefined,
    follow_ups: followUps,
    sources,
    attachments,
    contexts,
    widgets,
    parts: parseMoodieMessageParts(value.parts) || widgetsToMoodieParts(widgets),
    visual_schema_version: value.visual_schema_version === 1 ? 1 : undefined,
    actions: parseMoodieActions(value.actions),
    trace,
  };
}

export function mapMoodieMessage(row: MessageRow): MoodieMessage {
  const role = row.role === "assistant" ? "assistant" : "user";

  return {
    id: row.id,
    role: role as MoodieMessageRole,
    content: row.content || "",
    metadata: parseMoodieMessageMeta(row.metadata),
    parent_message_id: row.parent_message_id || null,
    revision: row.revision || 1,
    status: row.status === "pending" || row.status === "streaming" || row.status === "failed" || row.status === "cancelled" ? row.status : "completed",
    request_id: row.request_id || null,
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
    active_leaf_message_id: row.active_leaf_message_id || null,
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
