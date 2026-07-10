import type { MoodieIntentRoute } from "@/lib/moodie/intent-router";

export type MoodieRetrievedContext = {
  summary: string;
  hasContext: boolean;
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

function extractKeywords(prompt: string) {
  const text = normalizeText(prompt);
  const stopwords = new Set([
    "la",
    "va",
    "hay",
    "cho",
    "toi",
    "minh",
    "anh",
    "em",
    "cua",
    "tren",
    "duoi",
    "nay",
    "kia",
    "the",
    "nao",
    "bao",
    "nhieu",
    "mot",
    "cac",
    "voi",
    "ve",
    "trong",
    "khi",
    "can",
    "giup",
  ]);

  return [
    ...new Set(
      text
        .split(" ")
        .map((item) => item.trim())
        .filter((item) => item.length >= 3 && !stopwords.has(item)),
    ),
  ].slice(0, 8);
}

function buildBusinessContext(prompt: string, route: MoodieIntentRoute) {
  const keywords = extractKeywords(prompt);
  if (keywords.length === 0) {
    return { summary: "", hasContext: false } satisfies MoodieRetrievedContext;
  }

  const hints: Record<string, string[]> = {
    finance: ["ưu tiên số liệu kỳ hiện tại, công nợ, cashflow, mục tiêu"],
    contracts: ["ưu tiên mã hợp đồng, khách hàng, thanh toán, lịch chụp liên quan"],
    crm_calendar_ops: ["ưu tiên lịch sắp tới, ê-kíp, nhân sự, tiến độ vận hành"],
    catalog: ["ưu tiên danh mục dịch vụ, giá bán, trạng thái dịch vụ"],
    general: ["nếu có dữ liệu hệ thống liên quan thì gọi tool trước khi kết luận"],
  };

  return {
    summary: [
      "Retrieved context:",
      `- inferred_keywords: ${keywords.join(", ")}`,
      `- domain_hint: ${(hints[route.intent] || hints.general).join("; ")}`,
    ].join("\n"),
    hasContext: true,
  } satisfies MoodieRetrievedContext;
}

export function buildMoodieRetrievedContext(params: {
  prompt: string;
  route: MoodieIntentRoute;
}) {
  if (params.route.intent === "codebase" || params.route.intent === "general") {
    return { summary: "", hasContext: false } satisfies MoodieRetrievedContext;
  }

  return buildBusinessContext(params.prompt, params.route);
}
