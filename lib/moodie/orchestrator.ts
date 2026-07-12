import type { MoodieResearchIntent } from "@/lib/moodie/research-intent";

export type MoodieOrchestrationMode = "direct" | "foreground_tool" | "background_run";

export type MoodieOrchestrationDecision = {
  mode: MoodieOrchestrationMode;
  reason: string;
  foregroundCallBudget: number;
  backgroundRunBudget: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEEP_RESEARCH_SIGNALS = [
  "nghien cuu sau",
  "bao cao chi tiet",
  "lap bao cao",
  "phan tich chuyen sau",
  "tong hop nhieu nguon",
  "so sanh nhieu",
  "doi chieu nhieu",
  "deep research",
  "detailed report",
  "comprehensive report",
  "in depth analysis",
  "multi source",
  "market research",
];

const MULTI_QUERY_CONNECTORS = [
  " va so sanh ",
  " dong thoi ",
  " sau do ",
  " and compare ",
  " as well as ",
];

export function decideMoodieOrchestration(input: {
  prompt: string;
  research: MoodieResearchIntent;
}): MoodieOrchestrationDecision {
  if (!input.research.required) {
    return { mode: "direct", reason: "no_external_research", foregroundCallBudget: 0, backgroundRunBudget: 0 };
  }

  const text = ` ${normalize(input.prompt)} `;
  const deep = DEEP_RESEARCH_SIGNALS.some((signal) => text.includes(signal));
  const multiQuery = MULTI_QUERY_CONNECTORS.some((signal) => text.includes(signal));
  const longPrompt = text.split(" ").filter(Boolean).length > 55;

  if (deep || multiQuery || longPrompt) {
    return {
      mode: "background_run",
      reason: deep ? "deep_research_request" : multiQuery ? "multi_query_research" : "large_research_request",
      foregroundCallBudget: 0,
      backgroundRunBudget: 1,
    };
  }

  return {
    mode: "foreground_tool",
    reason: "bounded_single_lookup",
    foregroundCallBudget: 1,
    backgroundRunBudget: 0,
  };
}
