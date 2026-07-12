import { verifyMoodiePlanEvidence } from "@/lib/moodie/evidence-verifier";
import type { MoodieExecutionPlanV2 } from "@/lib/moodie/execution-plan-v2";
import { executeMoodieWorkflowPlan } from "@/lib/moodie/workflows/runtime";
import type { Database } from "@/types/database.types";
import type { MoodieEngineEvent, MoodieMessageMeta, MoodieMessagePart } from "@/types/moodie";
import type { Role } from "@/types/roles";
import type { SupabaseClient } from "@supabase/supabase-js";

type CollectionItem = { contract_code: string; customer_name: string; remaining_amount: number; status: string | null };
function money(value: number) { return `${Math.round(value).toLocaleString("vi-VN")} VND`; }

export async function runContractRiskReview(params: { plan: MoodieExecutionPlanV2; supabase: SupabaseClient<Database>; role: Role; userId?: string; conversationId?: string; emit?: (event: MoodieEngineEvent) => void; signal?: AbortSignal }): Promise<{ content: string; metadata: MoodieMessageMeta }> {
  const startedAt = Date.now();
  const execution = await executeMoodieWorkflowPlan(params);
  const evidence = verifyMoodiePlanEvidence(params.plan, execution.results);
  const collectionResult = execution.results.get("collection-risks") || {};
  const scheduleResult = execution.results.get("upcoming-schedules") || {};
  const collections = Array.isArray(collectionResult.items) ? collectionResult.items as CollectionItem[] : [];
  const scheduleTotal = Number(scheduleResult.total || 0);
  const totalRemaining = collections.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0);
  const parts: MoodieMessagePart[] = [
    { type: "metric_grid", title: "Rủi ro hợp đồng", items: [
      { label: "Hợp đồng cần thu", value: String(collections.length), tone: collections.length > 0 ? "warning" : "positive" },
      { label: "Tổng cần thu", value: money(totalRemaining), tone: totalRemaining > 0 ? "warning" : "positive" },
      { label: "Lịch 7 ngày tới", value: String(scheduleTotal), tone: scheduleTotal > 0 ? "default" : "positive" },
    ] },
  ];
  if (collections.length > 0) {
    parts.push({ type: "table", title: "Hợp đồng cần theo dõi", columns: [
      { key: "contract_code", label: "Hợp đồng" }, { key: "customer_name", label: "Khách hàng" }, { key: "remaining_amount", label: "Còn phải thu", format: "currency", align: "right" }, { key: "status", label: "Trạng thái", format: "status" },
    ], rows: collections.map((item) => ({ contract_code: item.contract_code, customer_name: item.customer_name, remaining_amount: item.remaining_amount, status: item.status })) });
    parts.push({ type: "alert_list", title: "Cảnh báo cần xử lý", items: collections.slice(0, 5).map((item) => ({ id: item.contract_code, title: `${item.contract_code} · ${item.customer_name}`, description: `Còn phải thu ${money(item.remaining_amount)}`, tone: item.remaining_amount >= totalRemaining / Math.max(1, collections.length) ? "danger" : "warning" })) });
    parts.push({ type: "action_list", title: "Hành động ưu tiên", items: collections.slice().sort((a, b) => b.remaining_amount - a.remaining_amount).slice(0, 3).map((item, index) => ({ id: `collect-${item.contract_code}`, label: `Xác nhận kế hoạch thu của ${item.contract_code}`, reason: `${item.customer_name} còn phải thu ${money(item.remaining_amount)}`, priority: index === 0 ? "high" : "medium" })) });
  }
  const content = !evidence.ok ? "Mình chưa lấy đủ dữ liệu để kết luận toàn bộ rủi ro hợp đồng." : collections.length === 0 ? `Hiện không có hợp đồng nào trong danh sách cần thu; có ${scheduleTotal} lịch trong 7 ngày tới.` : `Có ${collections.length} hợp đồng cần theo dõi với tổng phải thu ${money(totalRemaining)}; đồng thời có ${scheduleTotal} lịch trong 7 ngày tới.`;
  return { content, metadata: { provider: "Moodie workflow", skill_id: "contract_risk_review", skill_label: "Contract Risk Review", route_intent: "contracts", route_reason: "contract_risk_workflow", execution_plan: JSON.stringify(params.plan), sources: execution.sources, parts, visual_schema_version: 1, note: evidence.ok ? "evidence_complete" : "evidence_incomplete", follow_ups: ["Mở hợp đồng có khoản cần thu lớn nhất", "Lịch nào tuần này liên quan các hợp đồng này?"], trace: { engine: "model", started_at: new Date(startedAt).toISOString(), duration_ms: Date.now() - startedAt, agent_id: "operations_assistant", route_intent: "contracts", route_reason: "contract_risk_workflow", execution_plan: JSON.stringify(params.plan), model_steps: 0, tool_call_count: execution.tools.length, verifier_corrections: 0, fallback_used: false, tools: execution.tools } } };
}
