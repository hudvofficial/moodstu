import type { SupabaseClient } from "@supabase/supabase-js";
import { executeMoodieTool } from "@/lib/moodie/tools";
import { shouldRunMoodiePlanStep, type MoodieExecutionPlanV2 } from "@/lib/moodie/execution-plan-v2";
import type { Database } from "@/types/database.types";
import type { MoodieEngineEvent, MoodieMessageMeta, MoodieMessagePart } from "@/types/moodie";
import type { Role } from "@/types/roles";

export async function executeMoodieWorkflowPlan(params: {
  plan: MoodieExecutionPlanV2;
  supabase: SupabaseClient<Database>;
  role: Role;
  userId?: string;
  conversationId?: string;
  emit?: (event: MoodieEngineEvent) => void;
  signal?: AbortSignal;
}) {
  const results = new Map<string, Record<string, unknown>>();
  const parts: MoodieMessagePart[] = [];
  const sources: NonNullable<MoodieMessageMeta["sources"]> = [];
  const tools: NonNullable<MoodieMessageMeta["trace"]>["tools"] = [];

  for (const step of params.plan.steps) {
    if (!shouldRunMoodiePlanStep(step, results)) continue;
    if (params.signal?.aborted) throw new DOMException("Đã dừng phản hồi", "AbortError");
    const toolRunId = `workflow:${params.plan.skillId}:${step.id}`;
    const startedAt = Date.now();
    params.emit?.({ type: "tool.started", label: `Đang thực hiện ${step.id}`, tool_run_id: toolRunId, tool_name: step.tool });
    try {
      const execution = await executeMoodieTool(step.tool, { supabase: params.supabase, role: params.role, userId: params.userId, conversationId: params.conversationId, history: [] }, step.args || {});
      const duration = Date.now() - startedAt;
      results.set(step.id, execution.result);
      tools.push({ name: step.tool, ok: true, duration_ms: duration, result_bytes: JSON.stringify(execution.result).length });
      if (execution.metadata.parts) parts.push(...execution.metadata.parts);
      if (execution.metadata.sources) sources.push(...execution.metadata.sources);
      params.emit?.({ type: "tool.completed", label: `Đã hoàn tất ${step.id}`, tool_run_id: toolRunId, tool_name: step.tool, duration_ms: duration, sources: execution.metadata.sources, parts: execution.metadata.parts });
    } catch (error) {
      const duration = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      tools.push({ name: step.tool, ok: false, duration_ms: duration, error: message });
      params.emit?.({ type: "tool.failed", label: `Không thể hoàn tất ${step.id}`, tool_run_id: toolRunId, tool_name: step.tool, duration_ms: duration, error: message });
      if (step.required) throw error;
    }
  }

  return { results, parts, sources, tools };
}
