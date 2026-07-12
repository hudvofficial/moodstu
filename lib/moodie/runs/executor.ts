import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { researchWithBrave } from "@/lib/moodie/mcp/adapters/brave";
import { runMoodieEngine } from "@/lib/moodie/engine";
import { normalizeRole } from "@/types/roles";
import {
  appendMoodieRunProgress,
  completeMoodieAgentRun,
  failMoodieAgentRun,
  retryMoodieAgentRun,
} from "@/lib/moodie/runs/worker";
import type { Database, Json } from "@/types/database.types";

type AdminClient = SupabaseClient<Database>;
type AgentRun = Database["public"]["Tables"]["moodie_agent_runs"]["Row"];

function requestRecord(run: AgentRun) {
  return run.request && typeof run.request === "object" && !Array.isArray(run.request)
    ? run.request as Record<string, Json | undefined>
    : {};
}

function isRetryableWorkerError(error: string) {
  return /(?:timeout|timed out|429|rate limit|temporar|fetch failed|network|ECONN|5\d\d|circuit open|provider)/i.test(error)
    && !/(?:chưa được cấu hình|thiếu query|không có worker handler|unauthorized|forbidden)/i.test(error);
}

async function executeMoodieTask(input: { supabase: AdminClient; run: AgentRun; prompt: string; signal?: AbortSignal }) {
  const { data: employee, error: employeeError } = await input.supabase.from("employees")
    .select("auth_user_id, full_name, email, department, position, role")
    .eq("auth_user_id", input.run.user_id).eq("status", "active").single();
  if (employeeError || !employee) throw new Error("Không tìm thấy operator đang hoạt động cho task");
  const [conversationResult, historyResult] = input.run.conversation_id
    ? await Promise.all([
        input.supabase.from("ai_conversations").select("summary").eq("id", input.run.conversation_id).eq("user_id", input.run.user_id).maybeSingle(),
        input.supabase.from("ai_messages").select("role, content").eq("conversation_id", input.run.conversation_id)
          .in("role", ["user", "assistant"]).order("created_at", { ascending: false }).limit(12),
      ])
    : [{ data: null, error: null }, { data: [], error: null }];
  if (conversationResult.error || historyResult.error) throw new Error("Không thể tải context cho task nền");
  await appendMoodieRunProgress({ supabase: input.supabase, run: input.run, progress: 15, message: "Đã tải ngữ cảnh và quyền của người dùng" });
  const result = await runMoodieEngine({
    supabase: input.supabase,
    role: normalizeRole(employee.role),
    prompt: input.prompt,
    history: [...(historyResult.data || [])].reverse().map((message) => ({
      role: message.role === "assistant" ? "assistant" as const : "user" as const,
      content: message.content,
    })),
    userId: input.run.user_id,
    conversationId: input.run.conversation_id || undefined,
    conversationSummary: conversationResult.data?.summary || null,
    userContext: {
      id: input.run.user_id,
      fullName: employee.full_name || "Người dùng Mood Studio",
      email: employee.email,
      department: employee.department,
      position: employee.position,
      role: employee.role,
    },
    signal: input.signal,
  });
  await appendMoodieRunProgress({ supabase: input.supabase, run: input.run, progress: 90, message: "Moodie đã hoàn tất xử lý nghiệp vụ" });
  return completeMoodieAgentRun({
    supabase: input.supabase,
    run: input.run,
    result: JSON.parse(JSON.stringify({ content: result.content, metadata: result.metadata })) as Json,
  });
}

export async function executeMoodieAgentRun(input: {
  supabase: AdminClient;
  run: AgentRun;
  signal?: AbortSignal;
}) {
  try {
    const request = requestRecord(input.run);
    if (input.run.kind === "task") {
      const prompt = typeof request.prompt === "string" ? request.prompt : typeof request.question === "string" ? request.question : "";
      if (!prompt.trim()) throw new Error("Task run thiếu prompt");
      return await executeMoodieTask({ supabase: input.supabase, run: input.run, prompt, signal: input.signal });
    }
    if (input.run.kind === "action") {
      throw new Error("Action đã được xác nhận nhưng chưa có handler chuyên biệt an toàn");
    }
    if (input.run.kind !== "research") throw new Error(`Không có worker handler cho run kind: ${input.run.kind}`);
    const query = typeof request.query === "string" ? request.query : "";
    const mode = request.mode === "news" || request.mode === "local" ? request.mode : "web";
    if (!query.trim()) throw new Error("Research run thiếu query");

    await appendMoodieRunProgress({
      supabase: input.supabase,
      run: input.run,
      progress: 10,
      message: "Đang chuẩn bị truy vấn nghiên cứu an toàn",
    });
    const research = await researchWithBrave({ query, mode, signal: input.signal, userId: input.run.user_id });
    await appendMoodieRunProgress({
      supabase: input.supabase,
      run: input.run,
      progress: 80,
      message: `Đã kiểm tra ${research.sources.length} nguồn hợp lệ`,
      payload: { source_count: research.sources.length },
    });
    if (research.sources.length === 0) {
      throw new Error(research.warnings[0] || "Không tìm thấy nguồn nghiên cứu hợp lệ");
    }
    return completeMoodieAgentRun({
      supabase: input.supabase,
      run: input.run,
      result: research as unknown as Json,
      sourceRefs: research.sources.map((source) => ({
        id: source.id,
        title: source.title,
        url: source.url,
        provider: source.provider,
        retrieved_at: source.retrievedAt,
      })) as Json,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isRetryableWorkerError(message) && input.run.attempt_count < input.run.max_attempts) {
      return retryMoodieAgentRun({ supabase: input.supabase, run: input.run, error: message });
    }
    return failMoodieAgentRun({
      supabase: input.supabase,
      run: input.run,
      error: message,
    });
  }
}
