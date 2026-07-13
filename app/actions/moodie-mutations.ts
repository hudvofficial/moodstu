"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
import { buildMoodieConversationSummary } from "@/lib/moodie/conversation-summary";
import {
  curateMoodieMemories,
  curateMoodieMemoriesWithModel,
} from "@/lib/moodie/memory-curator";
import { createPendingMoodieMemory } from "@/lib/moodie/memory-store";
import {
  moodieDeleteConversationSchema,
  moodieDeleteMessageSchema,
  moodieFeedbackSchema,
  moodieMessageSchema,
  moodieRenameConversationSchema,
} from "@/lib/validations/moodie.schema";
import type { Database, Json } from "@/types/database.types";
import type { MoodieActivityEntry, MoodieEngineEvent, MoodieHistoryMessage, MoodieMessageSourceV2 } from "@/types/moodie";
import { mergeMoodieSources, normalizeMoodieSources, reduceMoodieActivityHistory } from "@/lib/moodie/response-metadata";
import { collectMoodieSubtreeIds, findMoodieFallbackLeaf } from "@/lib/moodie/branch-tree";

type AdminClient = SupabaseClient<Database>;

type ConversationRow = {
  id: string;
  user_id: string;
  active_leaf_message_id: string | null;
  title: string | null;
  last_message_preview: string | null;
  created_at: string | null;
  updated_at: string | null;
  locked_until: string | null;
  locked_by: string | null;
  summary: string | null;
  summary_updated_at: string | null;
  version: number | null;
};

type MessageRow = {
  id: string;
  role: string | null;
  content: string | null;
  metadata: Json | null;
  parent_message_id: string | null;
  revision: number | null;
  status: string | null;
  request_id: string | null;
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
    .select("id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, version, active_leaf_message_id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  const conversationSetupError = asMoodieSetupError(conversationError);
  if (conversationSetupError) throw conversationSetupError;
  if (conversationError || !conversation) {
    throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y cu\u1ed9c tr\u00f2 chuy\u1ec7n n\u00e0y");
  }

  const { data: messages, error: messageError } = await supabase
    .from("ai_messages")
    .select("id, role, content, metadata, parent_message_id, revision, status, request_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messageSetupError = asMoodieSetupError(messageError);
  if (messageSetupError) throw messageSetupError;
  if (messageError) throw new Error(`Kh\u00f4ng th\u1ec3 t\u1ea3i tin nh\u1eafn: ${messageError.message}`);

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
    .select("id, user_id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, summary, summary_updated_at, version, active_leaf_message_id")
    .single();

  const setupError = asMoodieSetupError(error);
  if (setupError) throw setupError;
  if (error || !data) {
    throw new Error(`Kh\u00f4ng th\u1ec3 t\u1ea1o h\u1ed9i tho\u1ea1i: ${error?.message || "Unknown"}`);
  }

  fireAuditLog({
    action: "CREATE",
    tableName: "ai_conversations",
    recordId: data.id,
    description: "T\u1ea1o cu\u1ed9c tr\u00f2 chuy\u1ec7n Moodie m\u1edbi",
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
    .select("id, user_id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, summary, summary_updated_at, version, active_leaf_message_id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  const currentSetupError = asMoodieSetupError(currentError);
  if (currentSetupError) throw currentSetupError;
  if (currentError || !current) {
    throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y cu\u1ed9c tr\u00f2 chuy\u1ec7n n\u00e0y");
  }

  const now = Date.now();
  if (
    current.locked_until &&
    new Date(current.locked_until).getTime() > now &&
    current.locked_by &&
    current.locked_by !== userId
  ) {
    throw new Error("Cu\u1ed9c tr\u00f2 chuy\u1ec7n n\u00e0y \u0111ang \u0111\u01b0\u1ee3c Moodie x\u1eed l\u00fd. Vui l\u00f2ng ch\u1edd xong l\u01b0\u1ee3t tr\u01b0\u1edbc.");
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
    .select("id, user_id, title, last_message_preview, created_at, updated_at, locked_until, locked_by, summary, summary_updated_at, version, active_leaf_message_id")
    .single();

  const lockSetupError = asMoodieSetupError(lockError);
  if (lockSetupError) throw lockSetupError;
  if (lockError || !locked) {
    throw new Error("Cu\u1ed9c tr\u00f2 chuy\u1ec7n v\u1eeba thay \u0111\u1ed5i \u1edf n\u01a1i kh\u00e1c. Vui l\u00f2ng t\u1ea3i l\u1ea1i r\u1ed3i th\u1eed l\u1ea1i.");
  }

  return locked as ConversationRow;
}

async function unlockConversation(
  supabase: AdminClient,
  conversationId: string,
  userId: string,
  payload: Partial<Pick<ConversationRow, "title" | "last_message_preview" | "summary" | "summary_updated_at" | "version" | "active_leaf_message_id">>,
) {
  const updatePayload = {
    title: payload.title ?? undefined,
    last_message_preview: payload.last_message_preview ?? undefined,
    version: payload.version ?? undefined,
    summary: payload.summary ?? undefined,
    summary_updated_at: payload.summary_updated_at ?? undefined,
    active_leaf_message_id: payload.active_leaf_message_id ?? undefined,
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
  if (error) throw new Error(`Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt h\u1ed9i tho\u1ea1i: ${error.message}`);
}

async function fetchConversationHistory(
  supabase: AdminClient,
  conversationId: string,
  leafMessageId?: string | null,
  limit = 12,
): Promise<MoodieHistoryMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, parent_message_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const setupError = asMoodieSetupError(error);
  if (setupError) throw setupError;
  if (error) throw new Error(`Kh\u00f4ng th\u1ec3 t\u1ea3i ng\u1eef c\u1ea3nh h\u1ed9i tho\u1ea1i: ${error.message}`);

  const messages = data || [];
  if (!leafMessageId) {
    return messages.slice(-limit).map<MoodieHistoryMessage>((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content || "",
    })).filter((message) => message.content.trim().length > 0);
  }

  const byId = new Map(messages.map((message) => [message.id, message]));
  const branch = [];
  let current = byId.get(leafMessageId);
  while (current && branch.length < limit) {
    branch.push(current);
    current = current.parent_message_id ? byId.get(current.parent_message_id) : undefined;
  }
  return branch.reverse().map<MoodieHistoryMessage>((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content || "",
  })).filter((message) => message.content.trim().length > 0);
}

export async function sendMoodieMessage(
  rawInput: unknown,
  emit?: (event: MoodieEngineEvent) => void,
  signal?: AbortSignal,
) {
  return withAuth(async (supabase, userId) => {
    const throwIfAborted = () => {
      if (signal?.aborted) throw new DOMException("Đã dừng phản hồi", "AbortError");
    };
    throwIfAborted();
    const parsed = moodieMessageSchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7");

    const { employee, role } = await requireMoodieAccess(supabase, userId);
    let prompt = parsed.data.content.trim();
    let turnAttachments = parsed.data.attachments;
    let turnContexts = parsed.data.contexts;
    const requestId = parsed.data.request_id || crypto.randomUUID();
    const turnId = parsed.data.turn_id || crypto.randomUUID();
    let conversation: ConversationRow | null = null;
    let activityHistory: MoodieActivityEntry[] = [];
    let sourcesV2: MoodieMessageSourceV2[] = [];
    const emitWithMetadata = (event: MoodieEngineEvent) => {
      const timestamp = new Date().toISOString();
      const eventSources = event.type === "tool.completed"
        ? normalizeMoodieSources(event.sources, event.tool_run_id)
        : [];
      sourcesV2 = mergeMoodieSources(sourcesV2, eventSources);
      activityHistory = reduceMoodieActivityHistory(
        activityHistory,
        event,
        timestamp,
        turnId,
        eventSources.map((source) => source.id),
      );
      emit?.(event);
    };

    try {
      conversation = parsed.data.conversation_id
        ? await lockExistingConversation(supabase, userId, parsed.data.conversation_id)
        : await createLockedConversation(supabase, userId, prompt);

      const { error: turnError } = await supabase.from("ai_turns").insert({
        id: turnId,
        request_id: requestId,
        conversation_id: conversation.id,
        user_id: userId,
        status: "running",
      });
      if (turnError) throw new Error(`Kh\u00f4ng th\u1ec3 kh\u1edfi t\u1ea1o l\u01b0\u1ee3t Moodie: ${turnError.message}`);

      let userMessage: { id: string } | null = null;
      if (parsed.data.continue_from_message_id) {
        const { data: sourceAssistant, error: sourceAssistantError } = await supabase.from("ai_messages")
          .select("id")
          .eq("id", parsed.data.continue_from_message_id)
          .eq("conversation_id", conversation.id)
          .eq("role", "assistant")
          .single();
        if (sourceAssistantError || !sourceAssistant) throw new Error("Không tìm thấy câu trả lời để tiếp tục");
        const { data: continuationUser, error: continuationError } = await supabase.from("ai_messages").insert({
          conversation_id: conversation.id,
          role: "user",
          content: prompt,
          parent_message_id: sourceAssistant.id,
          request_id: requestId,
          status: "completed",
          metadata: { provider: "user", continuation: true, attachments: [], contexts: [] },
        }).select("id").single();
        if (continuationError || !continuationUser) throw new Error(`Không thể tạo lượt tiếp tục: ${continuationError?.message || "Unknown"}`);
        userMessage = continuationUser;
      } else if (parsed.data.edit_from_message_id) {
        const { data: originalUser, error: originalUserError } = await supabase.from("ai_messages")
          .select("id, parent_message_id, metadata")
          .eq("id", parsed.data.edit_from_message_id)
          .eq("conversation_id", conversation.id)
          .eq("role", "user")
          .single();
        if (originalUserError || !originalUser) throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y c\u00e2u h\u1ecfi \u0111\u1ec3 ch\u1ec9nh s\u1eeda");
        const originalMetadata = originalUser.metadata && typeof originalUser.metadata === "object" && !Array.isArray(originalUser.metadata) ? originalUser.metadata : null;
        turnAttachments = Array.isArray(originalMetadata?.attachments) ? originalMetadata.attachments as typeof turnAttachments : turnAttachments;
        turnContexts = Array.isArray(originalMetadata?.contexts) ? originalMetadata.contexts as typeof turnContexts : turnContexts;
        let userSiblingQuery = supabase.from("ai_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .eq("role", "user");
        userSiblingQuery = originalUser.parent_message_id
          ? userSiblingQuery.eq("parent_message_id", originalUser.parent_message_id)
          : userSiblingQuery.is("parent_message_id", null);
        const { count: userSiblingCount } = await userSiblingQuery;
        const { data: editedUser, error: editedUserError } = await supabase.from("ai_messages").insert({
          conversation_id: conversation.id,
          role: "user",
          content: prompt,
          parent_message_id: originalUser.parent_message_id,
          revision: (userSiblingCount || 0) + 1,
          request_id: requestId,
          status: "completed",
          metadata: { provider: "user", attachments: turnAttachments, contexts: turnContexts },
        }).select("id").single();
        if (editedUserError || !editedUser) throw new Error(`Kh\u00f4ng th\u1ec3 l\u01b0u c\u00e2u h\u1ecfi \u0111\u00e3 ch\u1ec9nh s\u1eeda: ${editedUserError?.message || "Unknown"}`);
        userMessage = editedUser;
      } else if (parsed.data.regenerate_from_message_id) {
        const { data: existingUser, error: existingUserError } = await supabase.from("ai_messages")
          .select("id, content, metadata")
          .eq("id", parsed.data.regenerate_from_message_id)
          .eq("conversation_id", conversation.id)
          .eq("role", "user")
          .single();
        if (existingUserError || !existingUser) throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y c\u00e2u h\u1ecfi \u0111\u1ec3 t\u1ea1o l\u1ea1i ph\u1ea3n h\u1ed3i");
        userMessage = { id: existingUser.id };
        prompt = existingUser.content;
        const existingMetadata = existingUser.metadata && typeof existingUser.metadata === "object" && !Array.isArray(existingUser.metadata) ? existingUser.metadata : null;
        turnAttachments = Array.isArray(existingMetadata?.attachments) ? existingMetadata.attachments as typeof turnAttachments : [];
        turnContexts = Array.isArray(existingMetadata?.contexts) ? existingMetadata.contexts as typeof turnContexts : [];
      } else {
        const { data: insertedUser, error: userMessageError } = await supabase.from("ai_messages").insert({
          conversation_id: conversation.id,
          role: "user",
          content: prompt,
          parent_message_id: conversation.active_leaf_message_id,
          request_id: requestId,
          status: "completed",
          metadata: { provider: "user", attachments: turnAttachments, contexts: turnContexts },
        }).select("id").single();
        const userSetupError = asMoodieSetupError(userMessageError);
        if (userSetupError) throw userSetupError;
        if (userMessageError) throw new Error(`Kh\u00f4ng th\u1ec3 l\u01b0u c\u00e2u h\u1ecfi: ${userMessageError.message}`);
        userMessage = insertedUser;
      }

      const history = await fetchConversationHistory(supabase, conversation.id, userMessage?.id);

      throwIfAborted();
      const result = await runMoodieEngine({
        supabase,
        role,
        prompt,
        history,
        userId,
        conversationId: conversation.id,
        conversationSummary: conversation.summary,
        attachments: turnAttachments,
        contexts: turnContexts,
        responseProfile: parsed.data.response_profile,
        userContext: {
          id: employee.id,
          fullName: employee.full_name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          role,
        },
        emit: emitWithMetadata,
        signal,
      });
      throwIfAborted();
      emitWithMetadata({ type: "turn.saving", label: "Đang lưu câu trả lời" });

      const { count: siblingCount } = await supabase.from("ai_messages")
        .select("id", { count: "exact", head: true })
        .eq("parent_message_id", userMessage?.id || "")
        .eq("role", "assistant");

      throwIfAborted();
      const { data: assistantMessage, error: assistantMessageError } = await supabase.from("ai_messages").insert({
        conversation_id: conversation.id,
        role: "assistant",
        content: result.content,
        metadata: {
          ...result.metadata,
          response_ui_version: 2,
          activity_history: activityHistory,
          sources_v2: sourcesV2,
        },
        parent_message_id: userMessage?.id || null,
        revision: (siblingCount || 0) + 1,
        request_id: requestId,
        status: "completed",
      }).select("id").single();

      const assistantSetupError = asMoodieSetupError(assistantMessageError);
      if (assistantSetupError) throw assistantSetupError;
      if (assistantMessageError) throw new Error(`Kh\u00f4ng th\u1ec3 l\u01b0u ph\u1ea3n h\u1ed3i: ${assistantMessageError.message}`);

      const nextSummary = buildMoodieConversationSummary([
        ...history,
        { role: "assistant", content: result.content },
      ], conversation.summary);
      const memoryInput = userMessage && !parsed.data.regenerate_from_message_id && !parsed.data.edit_from_message_id && !parsed.data.continue_from_message_id
        ? { prompt, conversationId: conversation.id, sourceMessageId: userMessage.id }
        : null;
      const explicitMemoryCandidates = memoryInput ? curateMoodieMemories(memoryInput) : [];
      const memoryResults = await Promise.all(explicitMemoryCandidates.map((candidate) => createPendingMoodieMemory({ supabase, userId, candidate })));
      const memoryProposed = memoryResults.some(Boolean);

      if (memoryInput && explicitMemoryCandidates.length === 0) {
        after(async () => {
          const inferredCandidates = await curateMoodieMemoriesWithModel(memoryInput);
          await Promise.all(inferredCandidates.map((candidate) => createPendingMoodieMemory({
            supabase,
            userId,
            candidate,
          })));
        });
      }

      await unlockConversation(supabase, conversation.id, userId, {
        title: conversation.title || deriveConversationTitleFromPrompt(prompt),
        last_message_preview: excerptText(result.content),
        version: (conversation.version || 1) + 1,
        summary: nextSummary,
        summary_updated_at: new Date().toISOString(),
        active_leaf_message_id: assistantMessage?.id || conversation.active_leaf_message_id,
      });

      await supabase.from("ai_turns").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", turnId).eq("user_id", userId);

      fireAuditLog({
        action: "UPDATE",
        tableName: "ai_conversations",
        recordId: conversation.id,
        description: `Moodie x\u1eed l\u00fd y\u00eau c\u1ea7u b\u1eb1ng skill ${result.metadata.skill_id || "fallback"}`,
        newData: {
          provider: result.metadata.provider,
          skill_id: result.metadata.skill_id,
          route_intent: result.metadata.route_intent,
          route_reason: result.metadata.route_reason,
          retrieval_used: result.metadata.retrieval_used,
          execution_plan: result.metadata.execution_plan,
          trace: result.metadata.trace || null,
        },
        source: "server_action",
      });

      revalidatePath("/moodie");
      return {
        conversation: await fetchConversationDetail(supabase, userId, conversation.id),
        memoryProposed,
      };
    } catch (error) {
      const cancelled = signal?.aborted || (error instanceof DOMException && error.name === "AbortError");
      try {
        await supabase.from("ai_turns").update({
          status: cancelled ? "cancelled" : "failed",
          error: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", turnId).eq("user_id", userId);
      } catch {
        // Preserve the original turn error when failure persistence also fails.
      }
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

export async function submitMoodieFeedback(rawInput: unknown) {
  return withAuth(async (supabase, userId) => {
    const parsed = moodieFeedbackSchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Feedback kh\u00f4ng h\u1ee3p l\u1ec7");
    await requireMoodieAccess(supabase, userId);

    const { data: conversation } = await supabase.from("ai_conversations")
      .select("id")
      .eq("id", parsed.data.conversation_id)
      .eq("user_id", userId)
      .single();
    if (!conversation) throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ed9i tho\u1ea1i");

    const { data: message } = await supabase.from("ai_messages")
      .select("id, metadata")
      .eq("id", parsed.data.message_id)
      .eq("conversation_id", conversation.id)
      .eq("role", "assistant")
      .single();
    if (!message) throw new Error("Kh\u00f4ng t\u00ecm th\u1ea5y ph\u1ea3n h\u1ed3i Moodie");

    const { error } = await supabase.from("moodie_message_feedback").upsert({
      user_id: userId,
      conversation_id: conversation.id,
      message_id: message.id,
      rating: parsed.data.rating,
      note: parsed.data.note || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,message_id" });
    if (error) throw new Error(`Kh\u00f4ng th\u1ec3 l\u01b0u feedback: ${error.message}`);

    const currentMetadata = message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
      ? message.metadata
      : {};
    await supabase.from("ai_messages").update({
      metadata: {
        ...currentMetadata,
        feedback: { rating: parsed.data.rating, updated_at: new Date().toISOString() },
      },
    }).eq("id", message.id).eq("conversation_id", conversation.id);

    return { message_id: message.id, rating: parsed.data.rating };
  });
}

export async function deleteMoodieMessage(rawInput: unknown) {
  return withAuth(async (supabase, userId) => {
    const parsed = moodieDeleteMessageSchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");
    await requireMoodieAccess(supabase, userId);

    const { data: conversation } = await supabase.from("ai_conversations")
      .select("id, active_leaf_message_id")
      .eq("id", parsed.data.conversation_id)
      .eq("user_id", userId)
      .single();
    if (!conversation) throw new Error("Không tìm thấy hội thoại");

    const { data: rows, error: rowsError } = await supabase.from("ai_messages")
      .select("id, parent_message_id, role, created_at")
      .eq("conversation_id", conversation.id);
    if (rowsError) throw new Error(`Không thể tải cây tin nhắn: ${rowsError.message}`);
    const target = rows?.find((row) => row.id === parsed.data.message_id);
    if (!target) throw new Error("Không tìm thấy tin nhắn cần xóa");

    const subtree = collectMoodieSubtreeIds(rows || [], target.id);
    const fallbackLeafId = findMoodieFallbackLeaf(rows || [], target.id, subtree);

    const { error: deleteError } = await supabase.from("ai_messages").delete().in("id", [...subtree]).eq("conversation_id", conversation.id);
    if (deleteError) throw new Error(`Không thể xóa tin nhắn: ${deleteError.message}`);

    const detailBeforeUpdate = await fetchConversationDetail(supabase, userId, conversation.id);
    const lastMessage = detailBeforeUpdate.messages.at(-1);
    const { error: updateError } = await supabase.from("ai_conversations").update({
      active_leaf_message_id: fallbackLeafId,
      last_message_preview: lastMessage?.content ? excerptText(lastMessage.content) : null,
      version: (detailBeforeUpdate.version || 1) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", conversation.id).eq("user_id", userId);
    if (updateError) throw new Error(`Không thể cập nhật hội thoại sau khi xóa: ${updateError.message}`);

    revalidatePath("/moodie");
    return fetchConversationDetail(supabase, userId, conversation.id);
  });
}

export async function renameMoodieConversation(rawInput: unknown) {
  return withAuth(async (supabase, userId) => {
    const parsed = moodieRenameConversationSchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7");

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
      throw new Error("Ti\u00eau \u0111\u1ec1 v\u1eeba \u0111\u01b0\u1ee3c thay \u0111\u1ed5i \u1edf n\u01a1i kh\u00e1c. Vui l\u00f2ng t\u1ea3i l\u1ea1i r\u1ed3i th\u1eed l\u1ea1i.");
    }

    const { data: messageRefs, error: messageCountError } = await supabase
      .from("ai_messages")
      .select("conversation_id")
      .eq("conversation_id", parsed.data.conversation_id);

    const messageSetupError = asMoodieSetupError(messageCountError);
    if (messageSetupError) throw messageSetupError;
    if (messageCountError) throw new Error(`Kh\u00f4ng th\u1ec3 t\u1ea3i s\u1ed1 l\u01b0\u1ee3ng tin nh\u1eafn: ${messageCountError.message}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "ai_conversations",
      recordId: parsed.data.conversation_id,
      description: `\u0110\u1ed5i t\u00ean h\u1ed9i tho\u1ea1i Moodie th\u00e0nh "${parsed.data.title}"`,
      source: "server_action",
    });

    revalidatePath("/moodie");
    return mapMoodieConversationSummary(data as ConversationRow, (messageRefs || []).length);
  });
}

export async function deleteMoodieConversation(rawInput: unknown) {
  return withAuth(async (supabase, userId) => {
    const parsed = moodieDeleteConversationSchema.safeParse(rawInput);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7");

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
      throw new Error("Kh\u00f4ng th\u1ec3 x\u00f3a h\u1ed9i tho\u1ea1i n\u00e0y. Vui l\u00f2ng t\u1ea3i l\u1ea1i danh s\u00e1ch r\u1ed3i th\u1eed l\u1ea1i.");
    }

    fireAuditLog({
      action: "DELETE",
      tableName: "ai_conversations",
      recordId: parsed.data.conversation_id,
      description: `X\u00f3a h\u1ed9i tho\u1ea1i Moodie "${data.title || parsed.data.conversation_id}"`,
      source: "server_action",
    });

    revalidatePath("/moodie");
    return { id: parsed.data.conversation_id };
  });
}
