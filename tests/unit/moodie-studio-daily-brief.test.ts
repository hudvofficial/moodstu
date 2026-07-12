import { describe, expect, it, jest } from "@jest/globals";
import { planMoodieWorkflow } from "@/lib/moodie/execution-plan-v2";

const executeMoodieTool = jest.fn();
jest.mock("@/lib/moodie/tools", () => ({ executeMoodieTool }));

import { runStudioDailyBrief } from "@/lib/moodie/workflows/studio-daily-brief";

describe("studio_daily_brief workflow", () => {
  it("drills into overdue work and creates evidence-backed structured presentation", async () => {
    executeMoodieTool
      .mockResolvedValueOnce({ result: { active_employees: 5, active_departments: 3, overdue_tasks: 2 }, metadata: { sources: [] } })
      .mockResolvedValueOnce({ result: { total: 2, tasks: [
        { id: "task-1", work_type: "edit", contract_code: "HD-001", assignee_name: "An", days_overdue: 8 },
        { id: "task-2", work_type: "print", contract_code: "HD-002", assignee_name: null, days_overdue: 3 },
      ] }, metadata: { sources: [], parts: [] } });
    const plan = planMoodieWorkflow({ prompt: "Tình hình studio hiện tại?", role: "admin" });
    expect(plan).not.toBeNull();
    if (!plan) return;

    const result = await runStudioDailyBrief({ plan, supabase: {} as never, role: "admin" });

    expect(executeMoodieTool).toHaveBeenCalledTimes(2);
    expect(result.metadata.note).toBe("evidence_complete");
    expect(result.metadata.parts?.map((part) => part.type)).toEqual(["metric_grid", "alert_list", "action_list"]);
    expect(result.content).toContain("đã đối chiếu chi tiết");
    expect(JSON.stringify(result.metadata.parts)).toContain("HD-001");
    expect(JSON.stringify(result.metadata.parts)).toContain("Chưa phân công");
  });

  it("skips drill-down when there is no overdue work", async () => {
    executeMoodieTool.mockReset().mockResolvedValueOnce({ result: { active_employees: 5, active_departments: 3, overdue_tasks: 0 }, metadata: { sources: [] } });
    const plan = planMoodieWorkflow({ prompt: "Studio hôm nay thế nào?", role: "admin" });
    if (!plan) throw new Error("missing plan");

    const result = await runStudioDailyBrief({ plan, supabase: {} as never, role: "admin" });

    expect(executeMoodieTool).toHaveBeenCalledTimes(1);
    expect(result.metadata.parts?.map((part) => part.type)).toEqual(["metric_grid"]);
    expect(result.content).toContain("không có công việc quá hạn");
  });
});
