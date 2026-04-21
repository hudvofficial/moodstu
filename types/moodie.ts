import type { Json } from "@/types/database.types";

export type MoodieMessageRole = "user" | "assistant";
export type MoodieConversationScope = "all" | "active" | "locked";

export type MoodieSkillId =
  | "financial_summary"
  | "debt_summary"
  | "pending_collections"
  | "contract_lookup"
  | "schedule_summary"
  | "team_summary"
  | "goal_summary"
  | "service_catalog"
  | "fallback";

export type MoodieWidgetTone = "default" | "positive" | "warning" | "danger";

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

export interface MoodieMessageSource {
  label: string;
  value?: string;
  hint?: string;
}

export interface MoodieMessageMeta {
  provider: string;
  skill_id?: MoodieSkillId;
  skill_label?: string;
  note?: string | null;
  follow_ups?: string[];
  sources?: MoodieMessageSource[];
  widgets?: MoodieWidget[];
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
}

export type MoodieMetadataValue = Json | null;

export interface MoodieHistoryMessage {
  role: MoodieMessageRole;
  content: string;
}
