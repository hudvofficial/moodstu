import type { Json } from "@/types/database.types";

export type MoodieMessageRole = "user" | "assistant";
export type MoodieConversationScope = "all" | "active" | "locked";

export type MoodieSkillId =
  | "session_identity"
  | "financial_summary"
  | "debt_summary"
  | "pending_collections"
  | "contract_lookup"
  | "schedule_summary"
  | "gallery_delivery"
  | "gallery_images"
  | "team_summary"
  | "studio_daily_brief"
  | "financial_health_review"
  | "contract_risk_review"
  | "customer_lookup"
  | "overdue_tasks"
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

export type MoodieAlertListPart = {
  type: "alert_list";
  title: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    tone: "info" | "warning" | "danger" | "positive";
    owner?: string;
    due_label?: string;
  }>;
};

export type MoodieActionListPart = {
  type: "action_list";
  title: string;
  items: Array<{
    id: string;
    label: string;
    reason?: string;
    priority: "high" | "medium" | "low";
  }>;
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
  | MoodieAlertListPart
  | MoodieActionListPart
  | MoodieGalleryPart
  | MoodieDiagramPart;

export interface MoodieAttachment {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  storage_path: string;
}

export interface MoodieComposerContext {
  id: string;
  type: "capability" | "contract" | "customer" | "calendar" | "gallery" | "reporting_period";
  label: string;
  value?: string;
}

export interface MoodieComposerSubmission {
  content: string;
  attachments: MoodieAttachment[];
  contexts: MoodieComposerContext[];
}

export type MoodieMessageSourceKind = "web" | "database" | "document" | "internal";

export interface MoodieMessageSource {
  label: string;
  value?: string;
  hint?: string;
  kind?: MoodieMessageSourceKind;
  entity_type?: string;
  entity_id?: string;
  href?: string;
  metadata?: Record<string, Json>;
}

export type MoodieActivityKind = "request" | "route" | "context" | "plan" | "tool" | "generation" | "save";
export type MoodieActivityState = "running" | "completed" | "failed";

export interface MoodieActivityEntry {
  id: string;
  kind: MoodieActivityKind;
  action: string;
  label: string;
  state: MoodieActivityState;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  tool_name?: string;
  source_ids?: string[];
  error_code?: string;
}

export interface MoodieMessageSourceV2 {
  id: string;
  kind: MoodieMessageSourceKind;
  title: string;
  url?: string;
  href?: string;
  domain?: string;
  snippet?: string;
  entity_type?: string;
  entity_id?: string;
  tool_run_ids?: string[];
  /** @deprecated Read tool_run_ids instead. Kept for persisted v2 messages. */
  tool_run_id?: string;
  metadata?: Record<string, Json>;
}

export interface MoodieMessageFeedbackState {
  rating: -1 | 1 | null;
  updated_at?: string;
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
  engine: "model" | "core_fallback" | "session";
  started_at: string;
  duration_ms: number;
  provider?: string;
  agent_id?: string;
  route_intent?: string;
  route_reason?: string;
  retrieval_used?: boolean;
  research_required?: boolean;
  research_mode?: "web" | "news" | "local";
  allowed_tool_names?: string[];
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

export interface MoodieBackgroundRunRef {
  id: string;
  kind: "research" | "task" | "action";
  title: string;
  status: string;
}

export interface MoodieMessageMeta {
  provider: string;
  response_ui_version?: 2;
  activity_history?: MoodieActivityEntry[];
  sources_v2?: MoodieMessageSourceV2[];
  background_runs?: MoodieBackgroundRunRef[];
  feedback?: MoodieMessageFeedbackState;
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
  attachments?: MoodieAttachment[];
  contexts?: MoodieComposerContext[];
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
  parent_message_id?: string | null;
  revision?: number;
  status?: "pending" | "streaming" | "completed" | "failed" | "cancelled";
  request_id?: string | null;
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
  active_leaf_message_id?: string | null;
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
  providerReady: boolean;
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

export type MoodieTurnStage =
  | "accepted"
  | "routing"
  | "context"
  | "planning"
  | "tool"
  | "generating"
  | "saving"
  | "completed"
  | "failed"
  | "cancelled";

export type MoodieRuntimeEvent =
  | { type: "turn.accepted"; label: string }
  | { type: "route.resolved"; label: string; intent: string; agent_id: string; agent_label: string }
  | { type: "context.started"; label: string }
  | { type: "context.completed"; label: string; retrieval_used: boolean; memory_used: boolean }
  | { type: "plan.created"; label: string; summary: string; tool_names: string[] }
  | { type: "tool.started"; label: string; tool_run_id: string; tool_name: string }
  | { type: "tool.completed"; label: string; tool_run_id: string; tool_name: string; duration_ms: number; sources?: MoodieMessageSource[]; parts?: MoodieMessagePart[] }
  | { type: "tool.failed"; label: string; tool_run_id: string; tool_name: string; duration_ms: number; error: string }
  | { type: "generation.started"; label: string }
  | { type: "text.delta"; delta: string }
  | { type: "text.reset" }
  | { type: "part.created"; part_id: string; part: MoodieMessagePart }
  | { type: "memory.candidate"; label: string }
  | { type: "turn.saving"; label: string }
  | { type: "turn.completed"; label: string; data: MoodieSendResult }
  | { type: "turn.failed"; label: string; error: string; retryable: boolean }
  | { type: "turn.cancelled"; label: string };

export type MoodieEngineEvent = Exclude<
  MoodieRuntimeEvent,
  | { type: "turn.accepted" }
  | { type: "memory.candidate" }
  | { type: "turn.completed" }
  | { type: "turn.failed" }
  | { type: "turn.cancelled" }
>;

export type MoodieStreamEvent = MoodieRuntimeEvent & {
  version: 2;
  request_id: string;
  turn_id: string;
  sequence: number;
  timestamp: string;
};

export interface MoodieTurnActivity {
  id: string;
  stage: MoodieTurnStage;
  label: string;
  state: "active" | "done" | "error";
  toolName?: string;
  durationMs?: number;
}

export type MoodieMetadataValue = Json | null;

export interface MoodieHistoryMessage {
  role: MoodieMessageRole;
  content: string;
}
