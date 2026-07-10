import type { Json } from "@/types/database.types";

export type MoodieMessageRole = "user" | "assistant";
export type MoodieConversationScope = "all" | "active" | "locked";

export type MoodieSkillId =
  | "financial_summary"
  | "debt_summary"
  | "pending_collections"
  | "contract_lookup"
  | "schedule_summary"
  | "gallery_delivery"
  | "gallery_images"
  | "team_summary"
  | "goal_summary"
  | "service_catalog"
  | "fallback";

export type MoodieWidgetTone = "default" | "positive" | "warning" | "danger";
export type MoodieColorToken = MoodieWidgetTone | "info" | "primary";

export interface MoodieKpiCardItem {
  label: string;
  value: string;
  hint?: string;
  tone?: MoodieWidgetTone;
}

export interface MoodieProgressBarItem {
  label: string;
  current: number;
  target: number;
  unit?: string;
  hint?: string;
  tone?: MoodieWidgetTone;
}

export interface MoodieComparisonBarItem {
  label: string;
  value: number;
  value_label?: string;
  secondary_value?: number;
  secondary_label?: string;
  hint?: string;
  tone?: MoodieWidgetTone;
}

export type MoodieWidget =
  | {
      type: "kpi_cards";
      title?: string;
      items: MoodieKpiCardItem[];
    }
  | {
      type: "progress_bars";
      title?: string;
      items: MoodieProgressBarItem[];
    }
  | {
      type: "comparison_bars";
      title?: string;
      items: MoodieComparisonBarItem[];
    };

export type MoodieMetricGridPart = {
  type: "metric_grid";
  title?: string;
  items: MoodieKpiCardItem[];
};

export type MoodieChartPart = {
  type: "chart";
  chart: "bar" | "stacked_bar" | "line" | "area" | "donut" | "sparkline";
  title: string;
  description?: string;
  x_key: string;
  series: Array<{
    key: string;
    label: string;
    color_token: MoodieColorToken;
    value_format?: "number" | "currency" | "percent" | "duration";
  }>;
  data: Array<Record<string, string | number | null>>;
  insight?: string;
};

export type MoodieTimelinePart = {
  type: "timeline";
  title: string;
  groups: Array<{
    date: string;
    label: string;
    items: Array<{
      id: string;
      time_label: string;
      title: string;
      subtitle?: string;
      source: "studio" | "google" | "task";
      status?: string;
      tone?: MoodieWidgetTone;
      actions?: MoodieActionPreview[];
    }>;
  }>;
};

export type MoodieTablePart = {
  type: "table";
  title: string;
  columns: Array<{
    key: string;
    label: string;
    align?: "left" | "center" | "right";
    format?: "text" | "date" | "currency" | "percent" | "status";
  }>;
  rows: Array<Record<string, string | number | null>>;
  truncated?: boolean;
};

export type MoodieGalleryPart = {
  type: "gallery";
  title: string;
  summary?: string;
  layout: "grid" | "filmstrip";
  items: Array<{
    id: string;
    thumbnail_url: string;
    alt: string;
    file_name?: string;
    selected?: boolean;
    starred?: boolean;
    dimensions?: { width: number; height: number };
  }>;
  total_count: number;
  actions?: MoodieActionPreview[];
};

export type MoodieDiagramPart = {
  type: "diagram";
  diagram: "flow" | "relationship" | "funnel" | "status_flow";
  title: string;
  nodes: Array<{
    id: string;
    label: string;
    subtitle?: string;
    kind: "start" | "process" | "decision" | "entity" | "status" | "end";
    tone?: MoodieWidgetTone;
  }>;
  edges: Array<{ from: string; to: string; label?: string }>;
};

export type MoodieMessagePart =
  | MoodieMetricGridPart
  | MoodieChartPart
  | MoodieTimelinePart
  | MoodieTablePart
  | MoodieGalleryPart
  | MoodieDiagramPart;

export interface MoodieMessageSource {
  label: string;
  value?: string;
  hint?: string;
}

export interface MoodieActionPreview {
  id: string;
  kind: "navigate" | "sync_drive_gallery" | "refresh_gallery_share" | "sync_google_calendar";
  label: string;
  href?: string;
  target_id?: string;
  conversation_id?: string;
  description: string;
  risk: "none" | "low" | "medium" | "high";
  requires_approval: boolean;
}

export interface MoodieToolTrace {
  name: string;
  ok: boolean;
  duration_ms: number;
  result_bytes?: number;
  error?: string;
}

export interface MoodieTrace {
  engine: "model" | "core_fallback";
  started_at: string;
  duration_ms: number;
  provider?: string;
  agent_id?: string;
  route_intent?: string;
  route_reason?: string;
  retrieval_used?: boolean;
  execution_plan?: string;
  model_steps: number;
  tool_call_count: number;
  verifier_corrections: number;
  fallback_used: boolean;
  fallback_reason?: "provider_unavailable" | "provider_error";
  provider_latency_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  fallback_latency_ms?: number;
  tools: MoodieToolTrace[];
  error?: string;
}

export interface MoodieMessageMeta {
  provider: string;
  agent_id?: string;
  agent_label?: string;
  skill_id?: MoodieSkillId;
  skill_label?: string;
  note?: string | null;
  route_intent?: string;
  route_reason?: string;
  retrieval_used?: boolean;
  execution_plan?: string;
  follow_ups?: string[];
  sources?: MoodieMessageSource[];
  widgets?: MoodieWidget[];
  parts?: MoodieMessagePart[];
  visual_schema_version?: 1;
  actions?: MoodieActionPreview[];
  trace?: MoodieTrace;
}

export interface MoodieMessage {
  id: string;
  role: MoodieMessageRole;
  content: string;
  metadata: MoodieMessageMeta | null;
  created_at: string;
}

export interface MoodieConversationSummary {
  id: string;
  title: string;
  last_message_preview: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  locked_until: string | null;
  locked_by: string | null;
  version: number;
}

export interface MoodieConversationDetail extends MoodieConversationSummary {
  messages: MoodieMessage[];
}

export interface MoodieCapability {
  id: MoodieSkillId;
  label: string;
  description: string;
  prompts: string[];
}

export interface MoodiePageStats {
  totalConversations: number;
  totalMessages: number;
  lockedConversations: number;
  skillCount: number;
  providerLabel: string;
  telemetry: {
    observedMessages: number;
    averageLatencyMs: number;
    toolCallCount: number;
    fallbackCount: number;
    verifierCorrections: number;
    retrievalCount: number;
    lastTraceAt?: string;
  };
}

export interface MoodieSetupState {
  ready: boolean;
  message?: string;
  migrationPath?: string;
}

export interface MoodiePageData {
  stats: MoodiePageStats;
  conversations: MoodieConversationSummary[];
  activeConversation: MoodieConversationDetail | null;
  suggestions: string[];
  capabilities: MoodieCapability[];
  setup: MoodieSetupState;
}

export interface MoodieSendResult {
  conversation: MoodieConversationDetail;
  memoryProposed?: boolean;
}

export type MoodieStreamEvent =
  | { type: "status"; stage: "accepted" | "context" | "reasoning" | "saving"; label: string }
  | { type: "result"; data: MoodieSendResult }
  | { type: "error"; error: string }
  | { type: "done" };

export type MoodieMetadataValue = Json | null;

export interface MoodieHistoryMessage {
  role: MoodieMessageRole;
  content: string;
}
