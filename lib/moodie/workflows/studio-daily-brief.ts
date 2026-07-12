import type { SupabaseClient } from "@supabase/supabase-js";
import { executeMoodieTool } from "@/lib/moodie/tools";
import { shouldRunMoodiePlanStep, type MoodieExecutionPlanV2 } from "@/lib/moodie/execution-plan-v2";
import { verifyMoodiePlanEvidence } from "@/lib/moodie/evidence-verifier";
import type { Database } from "@/types/database.types";
import type { MoodieEngineEvent, MoodieMessageMeta, MoodieMessagePart } from "@/types/moodie";
import type { Role } from "@/types/roles";

type WorkflowResult = { content: string; metadata: MoodieMessageMeta };
type OverdueTask = { id: string; work_type: string; contract_code: string | null; assignee_name: string | null; days_overdue: number };

export async function runStudioDailyBrief(params: {
  plan: MoodieExecutionPlanV2;
  supabase: SupabaseClient<Database>;
  role: Role;
  userId?: string;
  conversationId?: string;
  emit?: (event: MoodieEngineEvent) => void;
  signal?: AbortSignal;
}): Promise<WorkflowResult> {
  const startedAt = Date.now();
  const results = new Map<string, Record<string, unknown>>();
  const parts: MoodieMessagePart[] = [];
  const sources: NonNullable<MoodieMessageMeta["sources"]> = [];
  const toolTraces: NonNullable<MoodieMessageMeta["trace"]>["tools"] = [];

  for (const step of params.plan.steps) {
    if (!shouldRunMoodiePlanStep(step, results)) continue;
    if (params.signal?.aborted) throw new DOMException("Đã dừng phản hồi", "AbortError");
    const toolRunId = `workflow:${params.plan.skillId}:${step.id}`;
    const toolStartedAt = Date.now();
    params.emit?.({ type: "tool.started", label: `Đang thực hiện ${step.id}`, tool_run_id: toolRunId, tool_name: step.tool });
    const execution = await executeMoodieTool(step.tool, { supabase: params.supabase, role: params.role, userId: params.userId, conversationId: params.conversationId, history: [] }, {});
    const duration = Date.now() - toolStartedAt;
    results.set(step.id, execution.result);
    toolTraces.push({ name: step.tool, ok: true, duration_ms: duration, result_bytes: JSON.stringify(execution.result).length });
    if (execution.metadata.parts) parts.push(...execution.metadata.parts);
    if (execution.metadata.sources) sources.push(...execution.metadata.sources);
    params.emit?.({ type: "tool.completed", label: `Đã hoàn tất ${step.id}`, tool_run_id: toolRunId, tool_name: step.tool, duration_ms: duration, sources: execution.metadata.sources, parts: execution.metadata.parts });
  }

  const overview = results.get("team-overview") || {};
  const activeEmployees = Number(overview.active_employees || 0);
  const departments = Number(overview.active_departments || 0);
  const overdueCount = Number(overview.overdue_tasks || 0);
  const overdueResult = results.get("overdue-details");
  const overdueTasks = Array.isArray(overdueResult?.tasks) ? overdueResult.tasks as OverdueTask[] : [];
  const evidence = verifyMoodiePlanEvidence(params.plan, results);
  const missingDetails = !evidence.ok;
  const unassigned = overdueTasks.filter((task) => !task.assignee_name);
  const mostUrgent = [...overdueTasks].sort((left, right) => right.days_overdue - left.days_overdue)[0];

  parts.unshift({ type: "metric_grid", title: "Tình hình Mood Studio", items: [
    { label: "Nhân sự hoạt động", value: String(activeEmployees) },
    { label: "Bộ phận", value: String(departments) },
    { label: "Công việc quá hạn", value: String(overdueCount), tone: overdueCount > 0 ? "warning" : "positive" },
  ] });

  if (overdueTasks.length > 0) {
    parts.push({ type: "alert_list", title: "Rủi ro cần xử lý", items: overdueTasks.slice(0, 5).map((task) => ({
      id: task.id,
      title: `${task.work_type}${task.contract_code ? ` · ${task.contract_code}` : ""}`,
      description: `Quá hạn ${task.days_overdue} ngày`,
      tone: task.days_overdue >= 7 ? "danger" : "warning",
      owner: task.assignee_name || "Chưa phân công",
      due_label: `${task.days_overdue} ngày`,
    })) });
    parts.push({ type: "action_list", title: "Hành động ưu tiên", items: [
      ...(mostUrgent ? [{ id: `review-${mostUrgent.id}`, label: `Xử lý ${mostUrgent.work_type}${mostUrgent.contract_code ? ` của ${mostUrgent.contract_code}` : ""}`, reason: `Đang quá hạn lâu nhất: ${mostUrgent.days_overdue} ngày`, priority: "high" as const }] : []),
      ...(unassigned.length > 0 ? [{ id: "assign-overdue", label: `Phân công owner cho ${unassigned.length} việc quá hạn`, reason: "Việc chưa có người chịu trách nhiệm khó được xử lý đúng hạn", priority: "high" as const }] : []),
      { id: "confirm-deadlines", label: "Xác nhận deadline mới với người phụ trách", reason: "Đưa các việc quá hạn trở lại kế hoạch có thể theo dõi", priority: "medium" as const },
    ] });
  }

  const content = overdueCount === 0
    ? `Mood Studio hiện có ${activeEmployees} nhân sự hoạt động trong ${departments} bộ phận và không có công việc quá hạn.`
    : missingDetails
      ? `Mood Studio có ${activeEmployees} nhân sự trong ${departments} bộ phận và ${overdueCount} công việc quá hạn. Mình chưa lấy được chi tiết nên chưa đưa ra khuyến nghị phân công cụ thể.`
      : `Mood Studio có ${activeEmployees} nhân sự trong ${departments} bộ phận và ${overdueCount} công việc quá hạn. Mình đã đối chiếu chi tiết để xếp thứ tự xử lý bên dưới.`;

  return { content, metadata: {
    provider: "Moodie workflow",
    skill_id: "studio_daily_brief",
    skill_label: "Studio Daily Brief",
    route_intent: "crm_calendar_ops",
    route_reason: "studio_daily_brief_workflow",
    execution_plan: JSON.stringify(params.plan),
    sources,
    parts,
    visual_schema_version: 1,
    note: missingDetails ? `evidence_incomplete:${evidence.issues.map((issue) => `${issue.stepId}/${issue.code}${issue.field ? `/${issue.field}` : ""}`).join(",")}` : "evidence_complete",
    follow_ups: overdueCount > 0 ? ["Cho mình xem chi tiết việc quá hạn", "Ai đang có tải công việc cao nhất?"] : ["Lịch hôm nay có gì quan trọng?"],
    trace: { engine: "model", started_at: new Date(startedAt).toISOString(), duration_ms: Date.now() - startedAt, agent_id: "operations_assistant", route_intent: "crm_calendar_ops", route_reason: "studio_daily_brief_workflow", execution_plan: JSON.stringify(params.plan), model_steps: 0, tool_call_count: toolTraces.length, verifier_corrections: 0, fallback_used: false, tools: toolTraces },
  } };
}
