import type { Role } from "@/types/roles";

export type MoodiePlanStep = {
  id: string;
  tool: string;
  required: boolean;
  condition?: { stepId: string; path: string; operator: "gt" | "eq"; value: number | string };
  expectedEvidence: string[];
  args?: Record<string, unknown>;
};

export type MoodieWorkflowSkillId = "studio_daily_brief" | "financial_health_review" | "contract_risk_review" | "customer_lookup";

export type MoodieExecutionPlanV2 = {
  version: 2;
  skillId: MoodieWorkflowSkillId;
  skillVersion: 1;
  objective: string;
  steps: MoodiePlanStep[];
  completionCriteria: string[];
  presentationMode: "operational_brief" | "financial_brief" | "contract_risk_brief" | "customer_brief";
};

function repairUtf8Mojibake(value: string) {
  if (![...value].every((character) => character.charCodeAt(0) <= 255)) return value;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from([...value].map((character) => character.charCodeAt(0))));
  } catch {
    return value;
  }
}

function normalize(value: string) {
  return repairUtf8Mojibake(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function planMoodieWorkflow(params: { prompt: string; role: Role }): MoodieExecutionPlanV2 | null {
  if (!(["admin", "manager", "sale"] as Role[]).includes(params.role)) return null;
  const repairedPrompt = repairUtf8Mojibake(params.prompt);
  const prompt = normalize(repairedPrompt);
  const asksStudioOverview = ["tinh hinh studio", "studio hien tai", "studio hom nay", "tong quan studio", "van hanh studio", "mood studio co gi"]
    .some((pattern) => prompt.includes(pattern));
  if (asksStudioOverview && (["admin", "manager"] as Role[]).includes(params.role)) return {
    version: 2,
    skillId: "studio_daily_brief",
    skillVersion: 1,
    objective: "Assess current studio operations and identify evidence-based priority actions.",
    steps: [
      { id: "team-overview", tool: "get_team_summary", required: true, expectedEvidence: ["active_employees", "active_departments", "overdue_tasks"] },
      { id: "overdue-details", tool: "get_overdue_tasks", required: false, condition: { stepId: "team-overview", path: "overdue_tasks", operator: "gt", value: 0 }, expectedEvidence: ["tasks", "assignee_name", "contract_code", "days_overdue"] },
    ],
    completionCriteria: ["Live employee, department and overdue counts are available.", "When overdue work exists, task, owner, contract and age details are collected.", "Recommendations refer to concrete evidence."],
    presentationMode: "operational_brief",
  };

  const asksFinancialHealth = ["tinh hinh tai chinh", "suc khoe tai chinh", "tai chinh hien tai", "rui ro dong tien", "financial health"]
    .some((pattern) => prompt.includes(pattern));
  if (asksFinancialHealth && (["admin", "manager"] as Role[]).includes(params.role)) return {
    version: 2,
    skillId: "financial_health_review",
    skillVersion: 1,
    objective: "Assess financial health, debt exposure, and concrete collection priorities from live data.",
    steps: [
      { id: "financial-overview", tool: "get_financial_summary", required: true, expectedEvidence: ["period", "total_revenue", "total_cost", "net_profit", "profit_margin"] },
      { id: "debt-overview", tool: "get_debt_summary", required: true, expectedEvidence: ["receivable", "payable", "overdue", "net_debt"] },
      { id: "collection-priorities", tool: "get_pending_collections", required: false, condition: { stepId: "debt-overview", path: "receivable", operator: "gt", value: 0 }, expectedEvidence: ["items"], args: { limit: 5 } },
    ],
    completionCriteria: ["Revenue, cost, profit and margin are live.", "Receivable, payable and overdue exposure are live.", "When receivables exist, concrete contracts to collect are identified."],
    presentationMode: "financial_brief",
  };

  const asksContractRisk = ["rui ro hop dong", "hop dong co rui ro", "contract risk", "hop dong can xu ly", "hop dong dang nguy hiem"]
    .some((pattern) => prompt.includes(pattern));
  if (asksContractRisk && (["admin", "manager"] as Role[]).includes(params.role)) return {
    version: 2,
    skillId: "contract_risk_review",
    skillVersion: 1,
    objective: "Identify contract collection and delivery risks that require action.",
    steps: [
      { id: "collection-risks", tool: "get_pending_collections", required: true, expectedEvidence: ["total", "items"], args: { limit: 8 } },
      { id: "upcoming-schedules", tool: "get_upcoming_schedules", required: true, expectedEvidence: ["total"], args: { range: "week" } },
    ],
    completionCriteria: ["Contracts with pending collection are listed.", "Upcoming delivery or schedule pressure is checked.", "Every recommendation names a contract or clearly states missing evidence."],
    presentationMode: "contract_risk_brief",
  };

  const customerMatch = repairedPrompt.match(/(?:khách(?: hàng)?|customer)\s+([^,?.]+?)(?:\s+(?:còn|có|hiện|đang|thế nào|ra sao)|[,.?]|$)/i);
  if (customerMatch?.[1]?.trim()) return {
    version: 2,
    skillId: "customer_lookup",
    skillVersion: 1,
    objective: `Build a live customer brief for ${customerMatch[1].trim()}.`,
    steps: [
      { id: "customer-contracts", tool: "search_contracts", required: true, expectedEvidence: ["total", "contracts"], args: { keyword: customerMatch[1].trim() } },
    ],
    completionCriteria: ["Matching contracts are identified from live data.", "Payment balance and work date are presented per contract.", "No unrelated customer data is included."],
    presentationMode: "customer_brief",
  };

  return null;
}

export function readPlanValue(result: Record<string, unknown> | undefined, path: string) {
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, result);
}

export function shouldRunMoodiePlanStep(step: MoodiePlanStep, results: Map<string, Record<string, unknown>>) {
  if (!step.condition) return true;
  const actual = readPlanValue(results.get(step.condition.stepId), step.condition.path);
  if (step.condition.operator === "gt") return typeof actual === "number" && actual > Number(step.condition.value);
  return actual === step.condition.value;
}
