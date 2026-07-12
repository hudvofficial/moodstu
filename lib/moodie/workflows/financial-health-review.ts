import { verifyMoodiePlanEvidence } from "@/lib/moodie/evidence-verifier";
import type { MoodieExecutionPlanV2 } from "@/lib/moodie/execution-plan-v2";
import { executeMoodieWorkflowPlan } from "@/lib/moodie/workflows/runtime";
import type { MoodieMessageMeta, MoodieMessagePart } from "@/types/moodie";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Role } from "@/types/roles";
import type { MoodieEngineEvent } from "@/types/moodie";

function money(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} VND`;
}

type CollectionItem = { contract_code: string; customer_name: string; remaining_amount: number; status: string | null };

export async function runFinancialHealthReview(params: {
  plan: MoodieExecutionPlanV2; supabase: SupabaseClient<Database>; role: Role; userId?: string; conversationId?: string; emit?: (event: MoodieEngineEvent) => void; signal?: AbortSignal;
}): Promise<{ content: string; metadata: MoodieMessageMeta }> {
  const startedAt = Date.now();
  const execution = await executeMoodieWorkflowPlan(params);
  const evidence = verifyMoodiePlanEvidence(params.plan, execution.results);
  const finance = execution.results.get("financial-overview") || {};
  const debt = execution.results.get("debt-overview") || {};
  const collectionsResult = execution.results.get("collection-priorities") || {};
  const collections = Array.isArray(collectionsResult.items) ? collectionsResult.items as CollectionItem[] : [];
  const revenue = Number(finance.total_revenue || 0);
  const cost = Number(finance.total_cost || 0);
  const profit = Number(finance.net_profit || 0);
  const margin = Number(finance.profit_margin || 0);
  const receivable = Number(debt.receivable || 0);
  const payable = Number(debt.payable || 0);
  const overdue = Number(debt.overdue || 0);

  const parts: MoodieMessagePart[] = [
    { type: "metric_grid", title: `Sức khỏe tài chính · ${String(finance.period || "Kỳ hiện tại")}`, items: [
      { label: "Doanh thu", value: money(revenue), tone: "positive" },
      { label: "Tổng chi", value: money(cost), tone: "warning" },
      { label: "Lợi nhuận ròng", value: money(profit), tone: profit >= 0 ? "positive" : "danger" },
      { label: "Biên lợi nhuận", value: `${margin.toLocaleString("vi-VN")}%`, tone: margin >= 20 ? "positive" : margin >= 0 ? "warning" : "danger" },
    ] },
    { type: "metric_grid", title: "Công nợ", items: [
      { label: "Phải thu", value: money(receivable), tone: receivable > 0 ? "warning" : "positive" },
      { label: "Phải trả", value: money(payable), tone: payable > 0 ? "warning" : "default" },
      { label: "Quá hạn", value: money(overdue), tone: overdue > 0 ? "danger" : "positive" },
    ] },
  ];

  if (collections.length > 0) {
    parts.push({ type: "table", title: "Khoản cần thu ưu tiên", columns: [
      { key: "contract_code", label: "Hợp đồng" }, { key: "customer_name", label: "Khách hàng" }, { key: "remaining_amount", label: "Còn phải thu", format: "currency", align: "right" }, { key: "status", label: "Trạng thái", format: "status" },
    ], rows: collections.map((item) => ({ contract_code: item.contract_code, customer_name: item.customer_name, remaining_amount: item.remaining_amount, status: item.status })) });
    const largest = [...collections].sort((a, b) => b.remaining_amount - a.remaining_amount)[0];
    parts.push({ type: "action_list", title: "Hành động tài chính", items: [
      { id: `collect-${largest.contract_code}`, label: `Ưu tiên thu ${money(largest.remaining_amount)} từ ${largest.contract_code}`, reason: `${largest.customer_name} là khoản phải thu lớn nhất trong danh sách hiện tại`, priority: "high" },
      ...(overdue > 0 ? [{ id: "review-overdue", label: "Rà soát toàn bộ công nợ quá hạn", reason: `Giá trị quá hạn hiện là ${money(overdue)}`, priority: "high" as const }] : []),
    ] });
  }

  const content = !evidence.ok
    ? "Mình chưa thu thập đủ bằng chứng để kết luận đầy đủ về sức khỏe tài chính. Các phần có dữ liệu đã được trình bày bên dưới."
    : profit < 0
      ? `Kỳ này đang lỗ ${money(Math.abs(profit))}; công nợ phải thu là ${money(receivable)}. Cần ưu tiên kiểm soát chi phí và thu hồi các khoản lớn.`
      : `Kỳ này lãi ${money(profit)} với biên lợi nhuận ${margin.toLocaleString("vi-VN")}%. Công nợ phải thu hiện là ${money(receivable)}${overdue > 0 ? `, trong đó ${money(overdue)} đã quá hạn` : ""}.`;

  return { content, metadata: {
    provider: "Moodie workflow", skill_id: "financial_health_review", skill_label: "Financial Health Review", route_intent: "finance", route_reason: "financial_health_workflow", execution_plan: JSON.stringify(params.plan), sources: execution.sources, parts, visual_schema_version: 1, note: evidence.ok ? "evidence_complete" : `evidence_incomplete:${evidence.issues.map((issue) => `${issue.stepId}/${issue.code}`).join(",")}`, follow_ups: ["Khoản nào cần thu trước?", "Chi phí nào đang ảnh hưởng lợi nhuận?"],
    trace: { engine: "model", started_at: new Date(startedAt).toISOString(), duration_ms: Date.now() - startedAt, agent_id: "finance_analyst", route_intent: "finance", route_reason: "financial_health_workflow", execution_plan: JSON.stringify(params.plan), model_steps: 0, tool_call_count: execution.tools.length, verifier_corrections: 0, fallback_used: false, tools: execution.tools },
  } };
}
