import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMoodieMemoryContext, type MoodieMemoryType } from "@/lib/moodie/memory-policy";
import { moodieMemoryReviewPolicy } from "@/lib/moodie/memory-lifecycle";
import type { Database, Json } from "@/types/database.types";
import { getActiveMoodieProvider } from "@/lib/moodie/providers/registry";

function normalizeEmbedding(values: number[]) {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return magnitude > 0 ? values.map((value) => value / magnitude) : values;
}

function parseEmbedding(value: Json | null | undefined) {
  return Array.isArray(value) && value.every((item) => typeof item === "number") ? value as number[] : null;
}

function cosine(left: number[] | null, right: number[] | null) {
  if (!left || !right || left.length !== right.length) return 0;
  return left.reduce((score, value, index) => score + value * (right[index] || 0), 0);
}

async function embedMemoryText(text: string) {
  try {
    const provider = await getActiveMoodieProvider();
    if (!provider?.embed) return null;
    const result = await provider.embed(text);
    return result.ok ? { vector: normalizeEmbedding(result.embedding), model: provider.label } : null;
  } catch {
    return null;
  }
}

export async function loadMoodieMemoryContext(params: {
  supabase: SupabaseClient<Database>;
  userId?: string;
  conversationId?: string;
  prompt?: string;
}): Promise<{ context: string; records: Array<{ id: string; content: string }> }> {
  if (!params.userId) return { context: "", records: [] };

  const now = new Date().toISOString();
  try {
    const queryEmbeddingResult = params.prompt ? await embedMemoryText(params.prompt) : null;
    const queryEmbedding = queryEmbeddingResult?.vector || null;
    const { data: matched, error: matchError } = await params.supabase.rpc("match_moodie_memories", {
      p_user_id: params.userId,
      p_conversation_id: params.conversationId || undefined,
      p_query_text: params.prompt || "",
      p_query_embedding: queryEmbedding,
      p_limit: 5,
    });
    if (!matchError) {
      const ranked = (matched || []).map((memory) => ({
        id: memory.id,
        scope: memory.scope as "user" | "studio" | "conversation",
        memoryType: memory.memory_type as MoodieMemoryType,
        content: memory.content,
      }));
      if (ranked.length > 0) {
        const usedAt = new Date().toISOString();
        await Promise.all((matched || []).map((memory) => params.supabase.from("moodie_memories")
          .update({ last_used_at: usedAt, use_count: memory.use_count + 1 }).eq("id", memory.id))).catch(() => {});
      }
      return { context: buildMoodieMemoryContext(ranked), records: ranked.map((memory) => ({ id: memory.id, content: memory.content })) };
    }

    const userQuery = params.supabase
      .from("moodie_memories")
      .select("id, scope, memory_type, content, subject, predicate, importance, updated_at, use_count, embedding")
      .eq("scope", "user")
      .eq("user_id", params.userId)
      .eq("status", "active")
      .or("expires_at.is.null,expires_at.gt." + now)
      .or("review_after.is.null,review_after.gt." + now)
      .order("updated_at", { ascending: false })
      .limit(20);
    const studioQuery = params.supabase
      .from("moodie_memories")
      .select("id, scope, memory_type, content, subject, predicate, importance, updated_at, use_count, embedding")
      .eq("scope", "studio")
      .eq("status", "active")
      .or("expires_at.is.null,expires_at.gt." + now)
      .or("review_after.is.null,review_after.gt." + now)
      .order("updated_at", { ascending: false })
      .limit(20);
    const conversationQuery = params.conversationId
      ? params.supabase
          .from("moodie_memories")
          .select("id, scope, memory_type, content, subject, predicate, importance, updated_at, use_count, embedding")
          .eq("scope", "conversation")
          .eq("conversation_id", params.conversationId)
          .eq("status", "active")
          .or("expires_at.is.null,expires_at.gt." + now)
          .or("review_after.is.null,review_after.gt." + now)
          .order("updated_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [], error: null });

    const [userResult, studioResult, conversationResult] = await Promise.all([userQuery, studioQuery, conversationQuery]);
    if (userResult.error || studioResult.error || conversationResult.error) return { context: "", records: [] };

    const memories = [
      ...(conversationResult.data || []),
      ...(userResult.data || []),
      ...(studioResult.data || []),
    ].map((memory) => ({
      id: memory.id,
      scope: memory.scope as "user" | "studio" | "conversation",
      memoryType: memory.memory_type as MoodieMemoryType,
      content: memory.content,
      subject: memory.subject || "",
      predicate: memory.predicate || "",
      importance: Number(memory.importance || 0.5),
      updatedAt: memory.updated_at,
      useCount: memory.use_count || 0,
      embedding: parseEmbedding(memory.embedding),
    }));
    const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const queryTokens = new Set(normalize(params.prompt || "").split(/\W+/).filter((token) => token.length > 2));
    const nowMs = Date.now();
    const ranked = memories
      .map((memory, index) => {
        const memoryTokens = normalize(`${memory.subject} ${memory.predicate} ${memory.content}`).split(/\W+/).filter((token) => token.length > 2);
        const overlap = memoryTokens.reduce((score, token) => score + (queryTokens.has(token) ? 1 : 0), 0) / Math.max(1, new Set(memoryTokens).size);
        const goalBoost = ["goal", "project", "decision"].includes(memory.memoryType) ? 0.18 : 0;
        const scopeBoost = memory.scope === "conversation" ? 0.12 : memory.scope === "user" ? 0.08 : 0.04;
        const ageDays = Math.max(0, (nowMs - Date.parse(memory.updatedAt)) / 86_400_000);
        const recency = Math.max(0, 1 - ageDays / 180);
        const semantic = Math.max(0, cosine(queryEmbedding, memory.embedding));
        return { memory, index, score: semantic * 0.45 + overlap * 0.25 + memory.importance * 0.12 + goalBoost + scopeBoost + recency * 0.08 };
      })
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 5)
      .map((item) => item.memory);

    if (ranked.length > 0) {
      const usedAt = new Date().toISOString();
      await Promise.all(ranked.map((memory) => params.supabase.from("moodie_memories").update({ last_used_at: usedAt, use_count: memory.useCount + 1 }).eq("id", memory.id))).catch(() => {});
    }
    return { context: buildMoodieMemoryContext(ranked), records: ranked.map((memory) => ({ id: memory.id, content: memory.content })) };
  } catch {
    return { context: "", records: [] };
  }
}

export async function createPendingMoodieMemory(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  candidate: import("@/lib/moodie/memory-policy").MoodieMemoryCandidate;
}) {
  const existing = await params.supabase
    .from("moodie_memories")
    .select("id, content, status")
    .eq("user_id", params.userId)
    .eq("subject", params.candidate.subject || "user")
    .eq("predicate", params.candidate.predicate || `memory.${params.candidate.memoryType}`)
    .in("status", ["pending", "active"])
    .order("updated_at", { ascending: false })
    .limit(1);
  if (existing.error) return false;
  const previous = existing.data?.[0];
  if (previous?.content === params.candidate.content) return false;
  const confirmedAt = new Date();
  const lifecycle = moodieMemoryReviewPolicy(params.candidate.memoryType, confirmedAt);
  const { data: inserted, error } = await params.supabase.from("moodie_memories").insert({
    scope: params.candidate.scope,
    user_id: params.userId,
    conversation_id: params.candidate.conversationId || null,
    memory_type: params.candidate.memoryType,
    content: params.candidate.content,
    source_message_id: params.candidate.sourceMessageId || null,
    source_message_ids: params.candidate.sourceMessageIds || (params.candidate.sourceMessageId ? [params.candidate.sourceMessageId] : []),
    source_voice_turn_id: params.candidate.sourceVoiceTurnId || null,
    confidence: params.candidate.confidence,
    importance: params.candidate.importance ?? 0.5,
    subject: params.candidate.subject || "user",
    predicate: params.candidate.predicate || `memory.${params.candidate.memoryType}`,
    value: params.candidate.value ?? { text: params.candidate.content },
    supersedes_memory_id: previous?.id || null,
    status: params.candidate.autoActivate ? "active" : "pending",
    last_confirmed_at: params.candidate.autoActivate ? confirmedAt.toISOString() : null,
    reconfirmation_interval_days: lifecycle.reconfirmationIntervalDays,
    review_after: params.candidate.autoActivate ? lifecycle.reviewAfter : null,
  }).select("id").single();
  if (error || !inserted) return false;

  // Durability comes first: explicit memory must exist even when the embedding
  // provider is slow or unavailable. Semantic enrichment is best-effort after
  // the authoritative row has been committed.
  const embeddingUpdate = embedMemoryText(
    `${params.candidate.subject || "user"} ${params.candidate.predicate || `memory.${params.candidate.memoryType}`} ${params.candidate.content}`,
  ).then((embedding) => {
    if (!embedding) return;
    return params.supabase.from("moodie_memories").update({
      embedding: embedding.vector,
      embedding_model: embedding.model,
      embedding_updated_at: new Date().toISOString(),
    }).eq("id", inserted.id);
  }).catch(() => undefined);

  const supersessionUpdate = previous
    ? Promise.all([
      params.supabase.from("moodie_memories").update({ status: "archived" }).eq("id", previous.id),
      (params.supabase as unknown as SupabaseClient).from("moodie_memory_relations").insert({
        user_id: params.userId,
        source_memory_id: inserted.id,
        target_memory_id: previous.id,
        relation_type: "supersedes",
        confidence: params.candidate.confidence,
      }),
      ]).then(() => undefined)
    : Promise.resolve();

  await Promise.all([embeddingUpdate, supersessionUpdate]);
  return true;
}
