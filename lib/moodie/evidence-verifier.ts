import type { MoodieExecutionPlanV2 } from "@/lib/moodie/execution-plan-v2";

export type MoodieEvidenceIssue = {
  stepId: string;
  code: "required_step_missing" | "expected_field_missing" | "conditional_evidence_missing";
  field?: string;
};

function hasEvidence(value: unknown) {
  return value !== undefined && value !== null;
}

export function verifyMoodiePlanEvidence(plan: MoodieExecutionPlanV2, results: Map<string, Record<string, unknown>>) {
  const issues: MoodieEvidenceIssue[] = [];
  for (const step of plan.steps) {
    const result = results.get(step.id);
    if (step.required && !result) {
      issues.push({ stepId: step.id, code: "required_step_missing" });
      continue;
    }
    if (!result) continue;
    for (const field of step.expectedEvidence) {
      if (field === "assignee_name" || field === "contract_code" || field === "days_overdue") {
        const tasks = result.tasks;
        if (Array.isArray(tasks) && tasks.length > 0 && !tasks.every((task) => task && typeof task === "object" && field in task)) {
          issues.push({ stepId: step.id, code: "expected_field_missing", field });
        }
        continue;
      }
      if (!hasEvidence(result[field])) issues.push({ stepId: step.id, code: "expected_field_missing", field });
    }
  }

  const overview = results.get("team-overview");
  if (Number(overview?.overdue_tasks || 0) > 0) {
    const detailTasks = results.get("overdue-details")?.tasks;
    if (!Array.isArray(detailTasks) || detailTasks.length === 0) {
      issues.push({ stepId: "overdue-details", code: "conditional_evidence_missing", field: "tasks" });
    }
  }

  return { ok: issues.length === 0, issues };
}
