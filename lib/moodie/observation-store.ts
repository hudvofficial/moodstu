import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MoodieMessageMeta } from "@/types/moodie";
import { getActiveMoodieProvider } from "@/lib/moodie/providers/registry";
import { createPendingMoodieMemory } from "@/lib/moodie/memory-store";

function compact(value: string | null | undefined, limit: number) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

function toolNames(metadata: MoodieMessageMeta) {
  const names = metadata.trace?.tools
    ?.filter((tool) => tool.ok)
    .map((tool) => tool.name)
    .filter(Boolean) || [];
  return [...new Set(names)].slice(0, 12);
}

export async function recordMoodieObservation(input: {
  supabase: SupabaseClient;
  userId: string;
  conversationId: string;
  turnId: string;
  prompt: string;
  outcome: string;
  metadata: MoodieMessageMeta;
}) {
  const promptSummary = compact(input.prompt, 600);
  if (!promptSummary) return false;

  const { error } = await input.supabase.from("moodie_observations").insert({
    user_id: input.userId,
    conversation_id: input.conversationId,
    turn_id: input.turnId,
    route_intent: input.metadata.route_intent || null,
    prompt_summary: promptSummary,
    outcome_summary: compact(input.outcome, 1000) || null,
    tool_names: toolNames(input.metadata),
    succeeded: !input.metadata.trace?.error,
  });
  return !error;
}

export async function loadMoodieWorkingContext(input: {
  supabase: SupabaseClient;
  userId: string;
  conversationId?: string;
}) {
  const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data, error } = await input.supabase
    .from("moodie_observations")
    .select("prompt_summary, outcome_summary, tool_names, route_intent, created_at")
    .eq("user_id", input.userId)
    .eq("succeeded", true)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error || !data?.length) return "";

  const lines = data.reverse().map((observation, index) => {
    const tools = observation.tool_names?.length
      ? `; tools: ${observation.tool_names.join(", ")}`
      : "";
    return `${index + 1}. ${observation.prompt_summary} → ${observation.outcome_summary || "đã hoàn tất"}${tools}`;
  });
  return [
    "Working memory từ các lượt gần đây (chỉ dùng để nối tiến trình; dữ liệu live vẫn phải gọi tool):",
    ...lines,
  ].join("\n");
}

export async function reflectNextMoodieObservationBatch(input: {
  supabase: SupabaseClient;
  minimumCount?: number;
  userId?: string;
}) {
  let query = input.supabase
    .from("moodie_observations")
    .select("id, user_id, conversation_id, prompt_summary, outcome_summary, tool_names, created_at")
    .eq("succeeded", true)
    .is("reflected_at", null);
  if (input.userId) query = query.eq("user_id", input.userId);
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);

  const byUser = new Map<string, NonNullable<typeof data>>();
  for (const observation of data || []) {
    const group = byUser.get(observation.user_id) || [];
    group.push(observation);
    byUser.set(observation.user_id, group);
  }
  const selected = [...byUser.entries()].find(([, rows]) => rows.length >= (input.minimumCount || 3));
  if (!selected) return null;
  const [userId, allRows] = selected;
  const rows = allRows.slice(0, 12);
  const provider = await getActiveMoodieProvider();
  if (!provider) throw new Error("Không có provider để reflection");
  const response = await provider.chat([
    {
      role: "system",
      content: "Từ các lượt làm việc dưới đây, rút ra đúng một quan sát bền vững hữu ích cho lần sau: tiến trình đang theo đuổi, quyết định, cách trình bày, hoặc mẫu công việc. Không chép dữ liệu tài chính/live. Tối đa 500 ký tự, tiếng Việt, không markdown.",
    },
    {
      role: "user",
      content: rows.map((row, index) => `${index + 1}. ${row.prompt_summary} → ${row.outcome_summary || "đã hoàn tất"}`).join("\n"),
    },
  ], [], { toolChoice: "none", maxOutputTokens: 220 });
  if (!response.ok || !response.message.content?.trim()) throw new Error("Reflection không tạo được nội dung");
  const content = compact(response.message.content, 500);
  const created = await createPendingMoodieMemory({
    supabase: input.supabase as never,
    userId,
    candidate: {
      scope: "user",
      memoryType: "episodic",
      content,
      confidence: 0.78,
      importance: 0.65,
      subject: "user",
      predicate: "observation.reflection",
      value: { text: content, observation_count: rows.length },
      conversationId: rows.at(-1)?.conversation_id || undefined,
      autoActivate: false,
    },
  });
  if (!created) throw new Error("Không lưu được reflection memory");
  await input.supabase.from("moodie_observations")
    .update({ reflected_at: new Date().toISOString() })
    .in("id", rows.map((row) => row.id));
  return { userId, observationCount: rows.length };
}
