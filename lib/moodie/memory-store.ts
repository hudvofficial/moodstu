import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMoodieMemoryContext, type MoodieMemoryType } from "@/lib/moodie/memory-policy";
import type { Database } from "@/types/database.types";

export async function loadMoodieMemoryContext(params: {
  supabase: SupabaseClient<Database>;
  userId?: string;
  conversationId?: string;
  prompt?: string;
}) {
  if (!params.userId) return "";

  const now = new Date().toISOString();
  try {
    const userQuery = params.supabase
      .from("moodie_memories")
      .select("scope, memory_type, content")
      .eq("scope", "user")
      .eq("user_id", params.userId)
      .eq("status", "active")
      .or("expires_at.is.null,expires_at.gt." + now)
      .order("updated_at", { ascending: false })
      .limit(20);
    const studioQuery = params.supabase
      .from("moodie_memories")
      .select("scope, memory_type, content")
      .eq("scope", "studio")
      .eq("status", "active")
      .or("expires_at.is.null,expires_at.gt." + now)
      .order("updated_at", { ascending: false })
      .limit(20);
    const conversationQuery = params.conversationId
      ? params.supabase
          .from("moodie_memories")
          .select("scope, memory_type, content")
          .eq("scope", "conversation")
          .eq("conversation_id", params.conversationId)
          .eq("status", "active")
          .or("expires_at.is.null,expires_at.gt." + now)
          .order("updated_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [], error: null });

    const [userResult, studioResult, conversationResult] = await Promise.all([userQuery, studioQuery, conversationQuery]);
    if (userResult.error || studioResult.error || conversationResult.error) return "";

    const memories = [
      ...(conversationResult.data || []),
      ...(userResult.data || []),
      ...(studioResult.data || []),
    ].map((memory) => ({
      scope: memory.scope as "user" | "studio" | "conversation",
      memoryType: memory.memory_type as MoodieMemoryType,
      content: memory.content,
    }));
    const queryTokens = new Set((params.prompt || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().split(/\W+/).filter((token) => token.length > 2));
    const ranked = memories
      .map((memory, index) => ({
        memory,
        index,
        score: memory.content.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().split(/\W+/).reduce((score, token) => score + (queryTokens.has(token) ? 1 : 0), 0),
      }))
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 5)
      .map((item) => item.memory);

    return buildMoodieMemoryContext(ranked);
  } catch {
    return "";
  }
}

export async function createPendingMoodieMemory(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  candidate: import("@/lib/moodie/memory-policy").MoodieMemoryCandidate;
}) {
  const existing = await params.supabase
    .from("moodie_memories")
    .select("id")
    .eq("user_id", params.userId)
    .eq("content", params.candidate.content)
    .neq("status", "deleted")
    .limit(1);
  if (existing.error || (existing.data || []).length > 0) return false;

  const { error } = await params.supabase.from("moodie_memories").insert({
    scope: params.candidate.scope,
    user_id: params.userId,
    conversation_id: params.candidate.conversationId || null,
    memory_type: params.candidate.memoryType,
    content: params.candidate.content,
    source_message_id: params.candidate.sourceMessageId || null,
    confidence: params.candidate.confidence,
    status: "pending",
  });
  return !error;
}
