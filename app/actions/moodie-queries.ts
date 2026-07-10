"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuthRead, requireMoodieAccess } from "@/lib/auth_utils";
import { getMoodieCapabilitiesForRole, getMoodieDefaultSuggestions, MOODIE_PROVIDER_LABEL } from "@/lib/moodie/catalog";
import {
  createMoodieSetupError,
  getMoodieSetupMessage,
  isMissingMoodieTablesError,
  isMoodieSetupError,
  MOODIE_MIGRATION_PATH,
} from "@/lib/moodie/errors";
import {
  mapMoodieConversationDetail,
  mapMoodieConversationSummary,
  sortMoodieConversations,
} from "@/lib/moodie/records";
import { moodieConversationQuerySchema } from "@/lib/validations/moodie.schema";
import type { Database, Json } from "@/types/database.types";
import type { MoodieConversationDetail, MoodiePageData } from "@/types/moodie";

type AdminClient = SupabaseClient<Database>;

type ConversationRow = {
  id: string;
  title: string | null;
  last_message_preview: string | null;
  created_at: string | null;
  updated_at: string | null;
  locked_until: string | null;
  locked_by: string | null;
  message_count: number | null;
  version: number | null;
};

type MessageRow = {
  id: string;
  role: string | null;
  content: string | null;
  metadata: Json | null;
  created_at: string | null;
};

function emptyTelemetry() {
  return {
    observedMessages: 0,
    averageLatencyMs: 0,
    toolCallCount: 0,
    fallbackCount: 0,
    verifierCorrections: 0,
    retrievalCount: 0,
  };
}

function toSetupFallback(baseData: Omit<MoodiePageData, "setup">): MoodiePageData {
  return {
    ...baseData,
    setup: {
      ready: false,
      message: getMoodieSetupMessage(),
      migrationPath: MOODIE_MIGRATION_PATH,
    },
  };
}

async function loadConversationDetail(
  supabase: AdminClient,
  userId: string,
  conversationId: string,
): Promise<MoodieConversationDetail | null> {
  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .select("id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, version")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (conversationError) {
    if (isMissingMoodieTablesError(conversationError)) throw createMoodieSetupError();
    return null;
  }
  if (!conversation) return null;

  const { data: messages, error: messageError } = await supabase
    .from("ai_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messageError) {
    if (isMissingMoodieTablesError(messageError)) throw createMoodieSetupError();
    throw new Error(`Không thể tải tin nhắn: ${messageError.message}`);
  }

  return mapMoodieConversationDetail(
    conversation as ConversationRow,
    (messages || []).length,
    (messages || []) as MessageRow[],
  );
}

export async function getMoodiePageData() {
  return withAuthRead(async (supabase, userId) => {
    const { role } = await requireMoodieAccess(supabase, userId);

    const baseData = {
      stats: {
        totalConversations: 0,
        totalMessages: 0,
        lockedConversations: 0,
        skillCount: getMoodieCapabilitiesForRole(role).length,
        providerLabel: MOODIE_PROVIDER_LABEL,
        telemetry: emptyTelemetry(),
      },
      conversations: [],
      activeConversation: null,
      suggestions: getMoodieDefaultSuggestions(role),
      capabilities: getMoodieCapabilitiesForRole(role),
    };

    const setupFallback = toSetupFallback(baseData);

    try {
      const { data: conversations, error: conversationError } = await supabase
        .from("ai_conversations")
        .select("id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, message_count, version")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(30);

      if (conversationError) {
        if (isMissingMoodieTablesError(conversationError)) return setupFallback;
        throw new Error(`Không thể tải hội thoại Moodie: ${conversationError.message}`);
      }

      const firstConversation = (conversations || [])[0] as ConversationRow | undefined;
      const activeMessagesResult = firstConversation
        ? await supabase
            .from("ai_messages")
            .select("id, role, content, metadata, created_at")
            .eq("conversation_id", firstConversation.id)
            .order("created_at", { ascending: true })
        : { data: [], error: null };
      if (activeMessagesResult.error) {
        if (isMissingMoodieTablesError(activeMessagesResult.error)) throw createMoodieSetupError();
        throw new Error(`Không thể tải tin nhắn: ${activeMessagesResult.error.message}`);
      }

      const summaries = sortMoodieConversations(
        ((conversations || []) as ConversationRow[]).map((conversation) =>
          mapMoodieConversationSummary(conversation, conversation.message_count || 0),
        ),
      );

      const activeConversation = firstConversation
        ? mapMoodieConversationDetail(
            firstConversation,
            firstConversation.message_count || (activeMessagesResult.data || []).length,
            (activeMessagesResult.data || []) as MessageRow[],
          )
        : null;

      const now = Date.now();
      return {
        stats: {
          totalConversations: summaries.length,
          totalMessages: summaries.reduce((sum, conversation) => sum + conversation.message_count, 0),
          lockedConversations: summaries.filter((conversation) => {
            return conversation.locked_until && new Date(conversation.locked_until).getTime() > now;
          }).length,
          skillCount: getMoodieCapabilitiesForRole(role).length,
          providerLabel: MOODIE_PROVIDER_LABEL,
          telemetry: emptyTelemetry(),
        },
        conversations: summaries,
        activeConversation,
        suggestions: getMoodieDefaultSuggestions(role),
        capabilities: getMoodieCapabilitiesForRole(role),
        setup: {
          ready: true,
        },
      } satisfies MoodiePageData;
    } catch (error) {
      if (
        isMoodieSetupError(error) ||
        isMissingMoodieTablesError(error as { code?: string; message?: string; details?: string })
      ) {
        return setupFallback;
      }

      throw error;
    }
  });
}

export async function getMoodieConversationDetail(rawInput: unknown) {
  return withAuthRead(async (supabase, userId) => {
    const parsed = moodieConversationQuerySchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    await requireMoodieAccess(supabase, userId);
    const detail = await loadConversationDetail(supabase, userId, parsed.data.conversation_id);

    if (!detail) throw new Error("Không tìm thấy cuộc trò chuyện này");
    return detail;
  });
}
