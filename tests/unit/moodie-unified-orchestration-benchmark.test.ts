import { MOODIE_REGRESSION_SUITE } from "@/lib/moodie/regression-prompts";
import { routeMoodieIntent } from "@/lib/moodie/intent-router";
import { planMoodieExecution } from "@/lib/moodie/tool-planner";
import { fingerprintMoodieResearchQuery } from "@/lib/moodie/brave-usage";

const researchCases = MOODIE_REGRESSION_SUITE.filter((item) => [
  "current_external_news", "stable_general_no_search", "deep_external_research",
].includes(item.id));

describe("Moodie unified orchestration benchmark", () => {
  it.each(researchCases)("routes $id without wasting paid search", (scenario) => {
    const route = routeMoodieIntent({ prompt: scenario.prompt, role: "admin" });
    const plan = planMoodieExecution({ route, prompt: scenario.prompt, role: "admin" });
    expect(route.intent).toBe(scenario.expectedIntent);
    expect(plan.shouldForceTool).toBe(scenario.expectsToolUse);
    if (scenario.id === "current_external_news") {
      expect(route.research.required).toBe(true);
      expect(route.allowedToolNames).toEqual(["search_news"]);
    }
    if (scenario.id === "stable_general_no_search") {
      expect(route.research.required).toBe(false);
      expect(route.allowedToolNames.filter((name) => name.startsWith("search_"))).toHaveLength(0);
    }
    if (scenario.id === "deep_external_research") {
      expect(route.orchestration.mode).toBe("background_run");
      expect(plan.prioritizedToolNames[0]).toBe("start_deep_research");
    }
  });

  it("stores a non-reversible query fingerprint instead of query text", () => {
    const query = "private strategic research query";
    const fingerprint = fingerprintMoodieResearchQuery(query);
    expect(fingerprint).toMatch(/^[a-f0-9]{24}$/);
    expect(fingerprint).not.toContain("private");
    expect(fingerprintMoodieResearchQuery(query)).toBe(fingerprint);
  });
});
