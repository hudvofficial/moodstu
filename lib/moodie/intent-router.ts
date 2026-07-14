import { decideMoodieOrchestration, type MoodieOrchestrationDecision } from "@/lib/moodie/orchestrator";
import { classifyMoodieResearchIntent, type MoodieResearchIntent } from "@/lib/moodie/research-intent";
import type { MoodieHistoryMessage } from "@/types/moodie";
import type { Role } from "@/types/roles";
import { canExposeMoodieTool, MOODIE_TOOL_MANIFEST, type MoodieIntentDomain } from "@/lib/moodie/tool-manifest";

export type MoodieIntentRoute = {
  intent: MoodieIntentDomain;
  needsData: boolean;
  allowedToolNames: string[];
  reason: string;
  research: MoodieResearchIntent;
  orchestration: MoodieOrchestrationDecision;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isContextualFollowUp(prompt: string) {
  if (prompt.split(" ").length > 12) return false;
  return /\b(con|them|tiep|chi tiet|giai thich|the nao|sao|vay|nay|do|no)\b/.test(prompt);
}

function buildCorpus(prompt: string, history: MoodieHistoryMessage[] = []) {
  const normalizedPrompt = normalizeText(prompt);
  if (!isContextualFollowUp(normalizedPrompt)) return normalizedPrompt;

  const recentUserText = history
    .filter((item) => item.role === "user")
    .slice(-2)
    .map((item) => item.content)
    .join(" ");

  return normalizeText(recentUserText + " " + prompt);
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => containsKeyword(text, keyword));
}

function containsKeyword(text: string, keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`).test(text);
}

function isResearchTool(name: string) {
  return name === "search_web" || name === "search_news" || name === "search_local" || name === "start_deep_research";
}

function researchToolForMode(mode: MoodieResearchIntent["mode"], orchestration: MoodieOrchestrationDecision) {
  if (orchestration.mode === "background_run") return "start_deep_research";
  return mode === "news" ? "search_news" : mode === "local" ? "search_local" : "search_web";
}

function hasExplicitPublicUrl(value: string) {
  return /https?:\/\/[^\s]+/i.test(value);
}

function toolAllowedForRoute(name: string, domains: MoodieIntentDomain[], intent: MoodieIntentDomain, research: MoodieResearchIntent, orchestration: MoodieOrchestrationDecision, hasExplicitUrl: boolean) {
  if (isResearchTool(name)) return research.required && name === researchToolForMode(research.mode, orchestration);
  if (name === "browse_page") return hasExplicitUrl;
  if (intent === "general") return false;
  return domains.includes(intent);
}

export function routeMoodieIntent(params: {
  prompt: string;
  history?: MoodieHistoryMessage[];
  role: Role;
}): MoodieIntentRoute {
  const corpus = buildCorpus(params.prompt, params.history);
  const research = classifyMoodieResearchIntent(params.prompt);
  const orchestration = decideMoodieOrchestration({ prompt: params.prompt, research });
  const hasExplicitUrl = hasExplicitPublicUrl(params.prompt);

  const isCodebase =
    params.role === "admin" &&
    (hasAny(corpus, [
      "code", "codebase", "source", "repo", "repository", "schema", "migration", "rls", "rpc", "api", "component", "function", "hook", "file", "bug", "logic", "luong", "ham", "o dau", "dong nao",
    ]) || /\b(lib|app|components|types)\//.test(corpus));

  if (isCodebase) {
    const allowedToolNames = Object.values(MOODIE_TOOL_MANIFEST)
      .filter((entry) => ((entry.domains.includes("codebase") && (entry.name !== "browse_page" || hasExplicitUrl)) || (research.required && entry.name === researchToolForMode(research.mode, orchestration))) && canExposeMoodieTool(entry.name, params.role))
      .sort((left, right) => right.priority - left.priority)
      .map((entry) => entry.name);

    return {
      intent: "codebase",
      needsData: true,
      allowedToolNames,
      reason: "admin_codebase_question",
      research,
      orchestration,
    };
  }

  const financeScore = ["tai chinh", "doanh thu", "chi phi", "cong no", "thu chi", "cashflow", "muc tieu", "goal"].filter((keyword) => containsKeyword(corpus, keyword)).length;
  const contractsScore = ["hop dong", "contract", "khach", "khach hang", "thu tien", "con no", "booking"].filter((keyword) => containsKeyword(corpus, keyword)).length;
  const opsScore = ["lich", "schedule", "lich hen", "sap toi", "nhan su", "team", "nhan vien", "ca lam"].filter((keyword) => containsKeyword(corpus, keyword)).length;
  const catalogScore = ["dich vu", "bang gia", "service", "gia", "goi chup", "catalog"].filter((keyword) => containsKeyword(corpus, keyword)).length;

  let intent: MoodieIntentDomain = "general";
  let reason = "general_chat";

  if (financeScore >= contractsScore && financeScore >= opsScore && financeScore >= catalogScore && financeScore > 0) {
    intent = "finance";
    reason = "finance_keywords";
  } else if (contractsScore >= opsScore && contractsScore >= catalogScore && contractsScore > 0) {
    intent = "contracts";
    reason = "contract_keywords";
  } else if (opsScore >= catalogScore && opsScore > 0) {
    intent = "crm_calendar_ops";
    reason = "ops_keywords";
  } else if (catalogScore > 0) {
    intent = "catalog";
    reason = "catalog_keywords";
  }

  const allowedToolNames = Object.values(MOODIE_TOOL_MANIFEST)
    .filter((entry) => canExposeMoodieTool(entry.name, params.role))
    .filter((entry) => toolAllowedForRoute(entry.name, entry.domains, intent, research, orchestration, hasExplicitUrl))
    .sort((left, right) => right.priority - left.priority)
    .map((entry) => entry.name);

  return {
    intent,
    needsData: intent !== "general" || research.required || hasExplicitUrl,
    allowedToolNames,
    reason,
    research,
    orchestration,
  };
}
