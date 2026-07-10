import type { MoodieIntentRoute } from "@/lib/moodie/intent-router";
import type { Role } from "@/types/roles";

export type MoodieExecutionPlan = {
  summary: string;
  shouldForceTool: boolean;
  prioritizedToolNames: string[];
};

function prioritize(allowedToolNames: string[], preferred: string[]) {
  const allowed = new Set(allowedToolNames);
  const ordered = preferred.filter((name) => allowed.has(name));
  const remainder = allowedToolNames.filter((name) => !ordered.includes(name));
  return [...ordered, ...remainder];
}

export function planMoodieExecution(params: {
  route: MoodieIntentRoute;
  prompt: string;
  role: Role;
}) {
  const prompt = params.prompt.toLowerCase();

  if (params.route.intent === "codebase") {
    const prioritizedToolNames = prioritize(params.route.allowedToolNames, [
      prompt.includes("schema") || prompt.includes("rls") || prompt.includes("rpc") ? "get_schema" : "get_repo_map",
      "get_repo_map",
      "list_symbols",
      "grep_code",
      "read_file",
      "get_schema",
    ]);

    return {
      summary: "Plan: map codebase first, then inspect symbols/grep, then read exact file chunks before concluding.",
      shouldForceTool: true,
      prioritizedToolNames,
    } satisfies MoodieExecutionPlan;
  }

  const preferencesByIntent: Record<MoodieIntentRoute["intent"], string[]> = {
    finance: ["get_financial_summary", "get_debt_summary", "get_pending_collections", "get_financial_goals"],
    contracts: ["search_contracts", "get_contract_delivery_assets", "list_contract_gallery_images", "get_pending_collections", "get_calendar_agenda", "get_upcoming_schedules"],
    crm_calendar_ops: ["get_calendar_agenda", "get_upcoming_schedules", "get_team_summary", "search_contracts"],
    catalog: ["get_services_catalog"],
    codebase: ["get_repo_map"],
    general: [],
  };

  const prioritizedToolNames = prioritize(
    params.route.allowedToolNames,
    preferencesByIntent[params.route.intent] || [],
  );

  return {
    summary:
      params.route.needsData
        ? "Plan: gather live system data from the most relevant tool first, then summarize only what the retrieved data proves."
        : "Plan: answer directly if no live data is required; otherwise ask one short clarifying question.",
    shouldForceTool: params.route.needsData,
    prioritizedToolNames,
  } satisfies MoodieExecutionPlan;
}
