import type { MoodieHistoryMessage } from "@/types/moodie";
import type { Role } from "@/types/roles";
import { canExposeMoodieTool, MOODIE_TOOL_MANIFEST, type MoodieIntentDomain } from "@/lib/moodie/tool-manifest";

export type MoodieIntentRoute = {
  intent: MoodieIntentDomain;
  needsData: boolean;
  allowedToolNames: string[];
  reason: string;
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
  return keywords.some((keyword) => text.includes(keyword));
}

export function routeMoodieIntent(params: {
  prompt: string;
  history?: MoodieHistoryMessage[];
  role: Role;
}): MoodieIntentRoute {
  const corpus = buildCorpus(params.prompt, params.history);

  const isCodebase =
    params.role === "admin" &&
    (hasAny(corpus, [
      "code", "codebase", "source", "repo", "repository", "schema", "migration", "rls", "rpc", "api", "component", "function", "hook", "file", "bug", "logic", "luong", "ham", "o dau", "dong nao",
    ]) || /\b(lib|app|components|types)\//.test(corpus));

  if (isCodebase) {
    const allowedToolNames = Object.values(MOODIE_TOOL_MANIFEST)
      .filter((entry) => entry.domains.includes("codebase") && canExposeMoodieTool(entry.name, params.role))
      .sort((left, right) => right.priority - left.priority)
      .map((entry) => entry.name);

    return {
      intent: "codebase",
      needsData: true,
      allowedToolNames,
      reason: "admin_codebase_question",
    };
  }

  const financeScore = ["tai chinh", "doanh thu", "chi phi", "cong no", "thu chi", "cashflow", "muc tieu", "goal", "bao cao"].filter((keyword) => corpus.includes(keyword)).length;
  const contractsScore = ["hop dong", "contract", "khach", "khach hang", "thu tien", "con no", "booking"].filter((keyword) => corpus.includes(keyword)).length;
  const opsScore = ["lich", "schedule", "lich hen", "sap toi", "nhan su", "team", "nhan vien", "ca lam"].filter((keyword) => corpus.includes(keyword)).length;
  const catalogScore = ["dich vu", "bang gia", "service", "gia", "goi chup", "catalog"].filter((keyword) => corpus.includes(keyword)).length;

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
    .filter((entry) => intent === "general" || entry.domains.includes(intent))
    .sort((left, right) => right.priority - left.priority)
    .map((entry) => entry.name);

  return {
    intent,
    needsData: intent !== "general",
    allowedToolNames,
    reason,
  };
}
