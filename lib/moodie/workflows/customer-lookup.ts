import { verifyMoodiePlanEvidence } from "@/lib/moodie/evidence-verifier";
import type { MoodieExecutionPlanV2 } from "@/lib/moodie/execution-plan-v2";
import { executeMoodieWorkflowPlan } from "@/lib/moodie/workflows/runtime";
import type { Database } from "@/types/database.types";
import type { MoodieEngineEvent, MoodieMessageMeta, MoodieMessagePart } from "@/types/moodie";
import type { Role } from "@/types/roles";
import type { SupabaseClient } from "@supabase/supabase-js";

type Contract = { id: string; contract_code: string | null; customer_name: string; phone?: string | null; contract_date: string | null; work_date: string | null; status: string | null; total_amount: number | null; paid_amount: number | null; remaining_amount: number | null };

export async function runCustomerLookup(params: { plan: MoodieExecutionPlanV2; supabase: SupabaseClient<Database>; role: Role; userId?: string; conversationId?: string; emit?: (event: MoodieEngineEvent) => void; signal?: AbortSignal }): Promise<{ content: string; metadata: MoodieMessageMeta }> {
  const startedAt = Date.now();
  const execution = await executeMoodieWorkflowPlan(params);
  const evidence = verifyMoodiePlanEvidence(params.plan, execution.results);
  const result = execution.results.get("customer-contracts") || {};
  const contracts = Array.isArray(result.contracts) ? result.contracts as Contract[] : [];
  const totalRemaining = contracts.reduce((sum, contract) => sum + Number(contract.remaining_amount || 0), 0);
  const parts: MoodieMessagePart[] = [];
  if (contracts.length > 0) {
    const totalValue = contracts.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    parts.push({ type: "metric_grid", title: contracts[0]?.customer_name || "Khách hàng", items: [
      { label: "Hợp đồng", value: String(contracts.length) },
      { label: "Tổng giá trị", value: `${Math.round(totalValue).toLocaleString("vi-VN")} VND`, tone: "default" },
      { label: "Còn phải thu", value: `${Math.round(totalRemaining).toLocaleString("vi-VN")} VND`, tone: totalRemaining > 0 ? "warning" : "positive" },
    ] });
    parts.push({ type: "table", title: "Hợp đồng của khách hàng", columns: [
      { key: "contract_code", label: "Hợp đồng" }, { key: "status", label: "Trạng thái", format: "status" }, { key: "work_date", label: "Ngày thực hiện", format: "date" }, { key: "total_amount", label: "Giá trị", format: "currency", align: "right" }, { key: "remaining_amount", label: "Còn phải thu", format: "currency", align: "right" },
    ], rows: contracts.map((item) => ({ contract_code: item.contract_code || item.id, status: item.status, work_date: item.work_date, total_amount: item.total_amount, remaining_amount: item.remaining_amount })) });
    if (totalRemaining > 0) parts.push({ type: "action_list", title: "Hành động tiếp theo", items: [{ id: "confirm-payment", label: "Xác nhận kế hoạch thanh toán", reason: `Khách hàng còn phải thanh toán ${Math.round(totalRemaining).toLocaleString("vi-VN")} VND`, priority: "high" }] });
  }
  const content = !evidence.ok ? "Mình chưa đủ bằng chứng để lập hồ sơ khách hàng." : contracts.length === 0 ? "Mình chưa tìm thấy hợp đồng phù hợp với tên khách hàng này." : `Mình tìm thấy ${contracts.length} hợp đồng của ${contracts[0]?.customer_name}. Tổng số tiền còn phải thu là ${Math.round(totalRemaining).toLocaleString("vi-VN")} VND.`;
  return { content, metadata: { provider: "Moodie workflow", skill_id: "customer_lookup", skill_label: "Customer Lookup", route_intent: "contracts", route_reason: "customer_lookup_workflow", execution_plan: JSON.stringify(params.plan), sources: execution.sources, parts, visual_schema_version: parts.length ? 1 : undefined, note: evidence.ok ? "evidence_complete" : "evidence_incomplete", follow_ups: contracts.length ? ["Xem tiến độ gallery của hợp đồng này", "Lịch sắp tới của khách này là khi nào?"] : ["Thử tìm bằng mã hợp đồng hoặc số điện thoại"], trace: { engine: "model", started_at: new Date(startedAt).toISOString(), duration_ms: Date.now() - startedAt, agent_id: "operations_assistant", route_intent: "contracts", route_reason: "customer_lookup_workflow", execution_plan: JSON.stringify(params.plan), model_steps: 0, tool_call_count: execution.tools.length, verifier_corrections: 0, fallback_used: false, tools: execution.tools } } };
}
