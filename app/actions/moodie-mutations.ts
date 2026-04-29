"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { withAuth, requireMoodieAccess } from "@/lib/auth_utils";
import { fireAuditLog, logError } from "@/lib/audit";
import { MOODIE_LOCK_WINDOW_MS } from "@/lib/moodie/catalog";
import { getMoodieSetupMessage, isMissingMoodieTablesError } from "@/lib/moodie/errors";
import {
  deriveConversationTitleFromPrompt,
  excerptText,
  mapMoodieConversationDetail,
  mapMoodieConversationSummary,
} from "@/lib/moodie/records";
import { runMoodieEngine } from "@/lib/moodie/engine";
import {
  moodieDeleteConversationSchema,
  moodieMessageSchema,
  moodieRenameConversationSchema,
} from "@/lib/validations/moodie.schema";
import type { Database, Json } from "@/types/database.types";
import type { MoodieHistoryMessage } from "@/types/moodie";

type AdminClient = SupabaseClient<Database>;

type ConversationRow = {
  id: string;
  user_id: string;
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

function getLockDeadline() {
  return new Date(Date.now() + MOODIE_LOCK_WINDOW_MS).toISOString();
}

function asMoodieSetupError(
  error: { code?: string; message?: string; details?: string } | null | undefined,
) {
  if (!isMissingMoodieTablesError(error)) return null;
  return new Error(getMoodieSetupMessage());
}

async function fetchConversationDetail(
  supabase: AdminClient,
  userId: string,
  conversationId: string,
) {
  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .select("id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, version")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  const conversationSetupError = asMoodieSetupError(conversationError);
  if (conversationSetupError) throw conversationSetupError;
  if (conversationError || !conversation) {
    throw new Error("Không tìm thấy cuộc trò chuyện này");
  }

  const { data: messages, error: messageError } = await supabase
    .from("ai_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messageSetupError = asMoodieSetupError(messageError);
  if (messageSetupError) throw messageSetupError;
  if (messageError) throw new Error(`Không thể tải tin nhắn: ${messageError.message}`);

  return mapMoodieConversationDetail(
    conversation as ConversationRow,
    (messages || []).length,
    (messages || []) as MessageRow[],
  );
}

async function createLockedConversation(
  supabase: AdminClient,
  userId: string,
  prompt: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      title: deriveConversationTitleFromPrompt(prompt),
      last_message_preview: excerptText(prompt),
      locked_until: getLockDeadline(),
      locked_by: userId,
      updated_at: now,
    })
    .select("id, user_id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, version")
    .single();

  const setupError = asMoodieSetupError(error);
  if (setupError) throw setupError;
  if (error || !data) {
    throw new Error(`Không thể tạo hội thoại: ${error?.message || "Unknown"}`);
  }

  fireAuditLog({
    action: "CREATE",
    tableName: "ai_conversations",
    recordId: data.id,
    description: "Tạo cuộc trò chuyện Moodie mới",
    source: "server_action",
  });

  return data as ConversationRow;
}

async function lockExistingConversation(
  supabase: AdminClient,
  userId: string,
  conversationId: string,
) {
  const { data: current, error: currentError } = await supabase
    .from("ai_conversations")
    .select("id, user_id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, version")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  const currentSetupError = asMoodieSetupError(currentError);
  if (currentSetupError) throw currentSetupError;
  if (currentError || !current) {
    throw new Error("Không tìm thấy cuộc trò chuyện này");
  }

  const now = Date.now();
  if (
    current.locked_until &&
    new Date(current.locked_until).getTime() > now &&
    current.locked_by &&
    current.locked_by !== userId
  ) {
    throw new Error("Cuộc trò chuyện này đang được Moodie xử lý. Vui lòng chờ xong lượt trước.");
  }

  const { data: locked, error: lockError } = await supabase
    .from("ai_conversations")
    .update({
      locked_until: getLockDeadline(),
      locked_by: userId,
      updated_at: new Date().toISOString(),
      version: (current.version || 1) + 1,
    })
    .eq("id", conversationId)
    .eq("user_id", userId)
    .eq("updated_at", current.updated_at || "")
    .select("id, user_id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, version")
    .single();

  const lockSetupError = asMoodieSetupError(lockError);
  if (lockSetupError) throw lockSetupError;
  if (lockError || !locked) {
    throw new Error("Cuộc trò chuyện vừa thay đổi ở nơi khác. Vui lòng tải lại rồi thử lại.");
  }

  return locked as ConversationRow;
}

async function unlockConversation(
  supabase: AdminClient,
  conversationId: string,
  userId: string,
  payload: Partial<Pick<ConversationRow, "title" | "last_message_preview" | "version">>,
) {
  const updatePayload = {
    title: payload.title ?? undefined,
    last_message_preview: payload.last_message_preview ?? undefined,
    version: payload.version ?? undefined,
    locked_until: null,
    locked_by: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("ai_conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .eq("user_id", userId);

  const setupError = asMoodieSetupError(error);
  if (setupError) throw setupError;
  if (error) throw new Error(`Không thể cập nhật hội thoại: ${error.message}`);
}

async function fetchConversationHistory(
  supabase: AdminClient,
  conversationId: string,
  limit = 12,
): Promise<MoodieHistoryMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const setupError = asMoodieSetupError(error);
  if (setupError) throw setupError;
  if (error) throw new Error(`Không thể tải ngữ cảnh hội thoại: ${error.message}`);

  return [...(data || [])]
    .reverse()
    .map((message) => ({
      role: (message.role === "assistant" ? "assistant" : "user") as MoodieHistoryMessage["role"],
      content: message.content || "",
    }))
    .filter((message) => message.content.trim().length > 0);
}

export async function sendMoodieMessage(rawInput: unknown) {
  return withAuth(async (supabase, userId) => {
    const parsed = moodieMessageSchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    const { role } = await requireMoodieAccess(supabase, userId);
    const prompt = parsed.data.content.trim();
    let conversation: ConversationRow | null = null;

    try {
      conversation = parsed.data.conversation_id
        ? await lockExistingConversation(supabase, userId, parsed.data.conversation_id)
        : await createLockedConversation(supabase, userId, prompt);

      const { error: userMessageError } = await supabase.from("ai_messages").insert({
        conversation_id: conversation.id,
        role: "user",
        content: prompt,
      });

      const userSetupError = asMoodieSetupError(userMessageError);
      if (userSetupError) throw userSetupError;
      if (userMessageError) throw new Error(`Không thể lưu câu hỏi: ${userMessageError.message}`);

      const history = await fetchConversationHistory(supabase, conversation.id);

      const result = await runMoodieEngine({
        supabase,
        role,
        prompt,
        history,
      });

      const { error: assistantMessageError } = await supabase.from("ai_messages").insert({
        conversation_id: conversation.id,
        role: "assistant",
        content: result.content,
        metadata: result.metadata,
      });

      const assistantSetupError = asMoodieSetupError(assistantMessageError);
      if (assistantSetupError) throw assistantSetupError;
      if (assistantMessageError) throw new Error(`Không thể lưu phản hồi: ${assistantMessageError.message}`);

      await unlockConversation(supabase, conversation.id, userId, {
        title: conversation.title || deriveConversationTitleFromPrompt(prompt),
        last_message_preview: excerptText(result.content),
        version: (conversation.version || 1) + 1,
      });

      fireAuditLog({
        action: "UPDATE",
        tableName: "ai_conversations",
        recordId: conversation.id,
        description: `Moodie xử lý yêu cầu bằng skill ${result.metadata.skill_id || "fallback"}`,
        newData: {
          provider: result.metadata.provider,
          skill_id: result.metadata.skill_id,
        },
        source: "server_action",
      });

      revalidatePath("/moodie");
      return {
        conversation: await fetchConversationDetail(supabase, userId, conversation.id),
      };
    } catch (error) {
      if (conversation) {
        await unlockConversation(supabase, conversation.id, userId, {
          last_message_preview: conversation.last_message_preview,
          title: conversation.title,
          version: (conversation.version || 1) + 1,
        }).catch(() => {
          logError({
            error,
            context: "moodie.unlockAfterFailure",
            tableName: "ai_conversations",
            recordId: conversation?.id,
          }).catch(() => {});
        });
      }
      throw error;
    }
  });
}

export async function renameMoodieConversation(rawInput: unknown) {
  return withAuth(async (supabase, userId) => {
    const parsed = moodieRenameConversationSchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    await requireMoodieAccess(supabase, userId);

    const { data, error } = await supabase
      .from("ai_conversations")
      .update({
        title: parsed.data.title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.conversation_id)
      .eq("user_id", userId)
      .eq("updated_at", parsed.data.expected_updated_at)
      .select("id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, version")
      .single();

    const setupError = asMoodieSetupError(error);
    if (setupError) throw setupError;
    if (error || !data) {
      throw new Error("Tiêu đề vừa bị thay đổi ở nơi khác. Vui lòng tải lại rồi thử lại.");
    }

    const { data: messageRefs, error: messageCountError } = await supabase
      .from("ai_messages")
      .select("conversation_id")
      .eq("conversation_id", parsed.data.conversation_id);

    const messageSetupError = asMoodieSetupError(messageCountError);
    if (messageSetupError) throw messageSetupError;
    if (messageCountError) throw new Error(`Không thể tải số lượng tin nhắn: ${messageCountError.message}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "ai_conversations",
      recordId: parsed.data.conversation_id,
      description: `Đổi tên hội thoại Moodie thành "${parsed.data.title}"`,
      source: "server_action",
    });

    revalidatePath("/moodie");
    return mapMoodieConversationSummary(data as ConversationRow, (messageRefs || []).length);
  });
}

export async function deleteMoodieConversation(rawInput: unknown) {
  return withAuth(async (supabase, userId) => {
    const parsed = moodieDeleteConversationSchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");

    await requireMoodieAccess(supabase, userId);

    let deleteQuery = supabase
      .from("ai_conversations")
      .delete()
      .eq("id", parsed.data.conversation_id)
      .eq("user_id", userId);

    if (parsed.data.expected_updated_at) {
      deleteQuery = deleteQuery.eq("updated_at", parsed.data.expected_updated_at);
    }

    const { data, error } = await deleteQuery
      .select("id, title")
      .single();

    const setupError = asMoodieSetupError(error);
    if (setupError) throw setupError;
    if (error || !data) {
      throw new Error("Cuộc trò chuyện đã thay đổi hoặc đã bị xóa. Vui lòng tải lại danh sách.");
    }

    fireAuditLog({
      action: "DELETE",
      tableName: "ai_conversations",
      recordId: parsed.data.conversation_id,
      description: `Xóa hội thoại Moodie "${data.title || parsed.data.conversation_id}"`,
      source: "server_action",
    });

    revalidatePath("/moodie");
    return { id: parsed.data.conversation_id };
  });
}
