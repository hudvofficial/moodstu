import { runStudioDailyBrief } from "@/lib/moodie/workflows/studio-daily-brief";
import { runFinancialHealthReview } from "@/lib/moodie/workflows/financial-health-review";
import { runContractRiskReview } from "@/lib/moodie/workflows/contract-risk-review";
import { runCustomerLookup } from "@/lib/moodie/workflows/customer-lookup";
import type { MoodieExecutionPlanV2 } from "@/lib/moodie/execution-plan-v2";

export const MOODIE_WORKFLOW_REGISTRY = {
  financial_health_review: {
    id: "financial_health_review",
    version: 1,
    description: "Combine financial performance, debt exposure, and collection priorities into an evidence-backed brief.",
    requiredTools: ["get_financial_summary", "get_debt_summary"],
    optionalTools: ["get_pending_collections"],
    presentationMode: "financial_brief",
    run: runFinancialHealthReview,
  },
  contract_risk_review: {
    id: "contract_risk_review",
    version: 1,
    description: "Cross-check pending collections and upcoming schedules to identify contract risks.",
    requiredTools: ["get_pending_collections", "get_upcoming_schedules"],
    optionalTools: [],
    presentationMode: "contract_risk_brief",
    run: runContractRiskReview,
  },
  customer_lookup: {
    id: "customer_lookup",
    version: 1,
    description: "Build a scoped customer brief from matching live contracts.",
    requiredTools: ["search_contracts"],
    optionalTools: [],
    presentationMode: "customer_brief",
    run: runCustomerLookup,
  },
  studio_daily_brief: {
    id: "studio_daily_brief",
    version: 1,
    description: "Investigate current studio operations, drill into overdue work, verify evidence, and produce an operational brief.",
    requiredTools: ["get_team_summary"],
    optionalTools: ["get_overdue_tasks"],
    presentationMode: "operational_brief",
    run: runStudioDailyBrief,
  },
} as const;

export function getMoodieWorkflow(plan: MoodieExecutionPlanV2) {
  const workflow = MOODIE_WORKFLOW_REGISTRY[plan.skillId];
  if (!workflow || workflow.version !== plan.skillVersion) {
    throw new Error(`Unsupported Moodie workflow version: ${plan.skillId}@${plan.skillVersion}`);
  }
  return workflow;
}
