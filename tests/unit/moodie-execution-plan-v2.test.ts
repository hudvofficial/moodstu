import { describe, expect, it } from "@jest/globals";
import { planMoodieWorkflow, shouldRunMoodiePlanStep } from "@/lib/moodie/execution-plan-v2";

describe("Moodie ExecutionPlan v2", () => {
  it("selects studio_daily_brief for broad studio health questions", () => {
    const plan = planMoodieWorkflow({ prompt: "Tình hình studio hiện tại thế nào?", role: "admin" });
    expect(plan).toMatchObject({ version: 2, skillId: "studio_daily_brief", skillVersion: 1, presentationMode: "operational_brief" });
    expect(plan?.steps.map((step) => step.tool)).toEqual(["get_team_summary", "get_overdue_tasks"]);
  });

  it("builds domain-specific finance, contract-risk and customer workflows", () => {
    expect(planMoodieWorkflow({ prompt: "Tình hình tài chính hiện tại có rủi ro dòng tiền không?", role: "admin" })).toMatchObject({ skillId: "financial_health_review", presentationMode: "financial_brief" });
    expect(planMoodieWorkflow({ prompt: "Rủi ro hợp đồng nào cần xử lý?", role: "manager" })).toMatchObject({ skillId: "contract_risk_review", presentationMode: "contract_risk_brief" });
    expect(planMoodieWorkflow({ prompt: "Khách Linh còn hợp đồng nào?", role: "sale" })).toMatchObject({ skillId: "customer_lookup", steps: [{ args: { keyword: "Linh" } }] });
  });

  it("does not hijack unrelated or unauthorized requests", () => {
    expect(planMoodieWorkflow({ prompt: "Xin chào", role: "admin" })).toBeNull();
    expect(planMoodieWorkflow({ prompt: "Tình hình studio hiện tại?", role: "viewer" })).toBeNull();
  });

  it("runs overdue drill-down only when overview proves overdue work exists", () => {
    const plan = planMoodieWorkflow({ prompt: "Tổng quan studio", role: "admin" });
    const step = plan?.steps[1];
    expect(step).toBeDefined();
    if (!step) return;

    expect(shouldRunMoodiePlanStep(step, new Map([["team-overview", { overdue_tasks: 2 }]]))).toBe(true);
    expect(shouldRunMoodiePlanStep(step, new Map([["team-overview", { overdue_tasks: 0 }]]))).toBe(false);
  });
});
