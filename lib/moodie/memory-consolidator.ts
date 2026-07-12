import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveMoodieProvider } from "@/lib/moodie/providers/registry";
import { validateMoodieMemoryCandidate } from "@/lib/moodie/memory-policy";
import type { Database } from "@/types/database.types";

type AdminClient = SupabaseClient<Database>;

export async function consolidateNextMoodieEpisodicBatch(input: {
  supabase: AdminClient;
  minimumAgeDays?: number;
  batchSize?: number;
}) {
  const cutoff = new Date(Date.now() - (input.minimumAgeDays ?? 7) * 86_400_000).toISOString();
  const { data, error } = await input.supabase.from("moodie_memories")
    .select("id, user_id, content, created_at, source_message_ids")
    .eq("scope", "user").eq("memory_type", "episodic").eq("status", "active")
    .not("user_id", "is", null).lte("created_at", cutoff)
    .order("created_at", { ascending: true }).limit(200);
  if (error) throw new Error(error.message);

  const byUser = new Map<string, NonNullable<typeof data>>();
  for (const memory of data || []) {
    if (!memory.user_id) continue;
    const group = byUser.get(memory.user_id) || [];
    group.push(memory);
    byUser.set(memory.user_id, group);
  }
  const selected = [...byUser.entries()].find(([, memories]) => memories.length >= 2);
  if (!selected) return null;
  const [userId, allMemories] = selected;
  const memories = allMemories.slice(0, Math.max(2, Math.min(input.batchSize ?? 12, 20)));
  const provider = await getActiveMoodieProvider();
  if (!provider) throw new Error("Không có model để hợp nhất episodic memory");
  const result = await provider.chat([
    {
      role: "system",
      content: "Tóm tắt các episodic memory đã được người dùng duyệt thành một ghi nhớ bền vững bằng tiếng Việt. Chỉ giữ mô thức, tiến triển, quyết định hoặc bối cảnh hữu ích lâu dài. Không thêm sự kiện mới. Trả đúng một đoạn văn tối đa 700 ký tự, không markdown.",
    },
    { role: "user", content: memories.map((memory, index) => `${index + 1}. ${memory.content}`).join("\n") },
  ], [], { toolChoice: "none" });
  if (!result.ok || !result.message.content) throw new Error("Model không tạo được memory summary");
  const content = result.message.content.replace(/\s+/g, " ").trim().slice(0, 700);
  const validation = validateMoodieMemoryCandidate({
    scope: "user", memoryType: "summary", content, confidence: 0.85,
    importance: 0.7, subject: "user", predicate: "episodic.summary",
  });
  if (!validation.ok) throw new Error(`Memory summary không hợp lệ: ${validation.reason}`);
  const { data: summaryId, error: rpcError } = await input.supabase.rpc("finalize_moodie_memory_consolidation", {
    p_user_id: userId,
    p_source_ids: memories.map((memory) => memory.id),
    p_content: validation.candidate.content,
    p_value: { text: validation.candidate.content, source_count: memories.length },
    p_confidence: validation.candidate.confidence,
    p_importance: validation.candidate.importance,
  });
  if (rpcError) throw new Error(rpcError.message);
  return { summaryId, userId, sourceCount: memories.length };
}
