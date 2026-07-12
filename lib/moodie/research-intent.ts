export type MoodieResearchMode = "web" | "news" | "local";

export type MoodieResearchIntent = {
  required: boolean;
  requested: boolean;
  mode: MoodieResearchMode;
  freshness: "current" | "recent" | "stable";
  reason: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s:/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EXPLICIT_RESEARCH = [
  "tim tren web", "tim tren mang", "tim kiem web", "search web", "web search",
  "tra brave", "brave search", "kiem tra online", "verify online", "research", "nghien cuu",
  "deep research", "market research", "bao cao chi tiet", "comprehensive report", "detailed report",
  "tim nguon", "kem nguon", "dan nguon", "citation", "citations", "source link",
];

const CURRENT_SIGNALS = [
  "moi nhat", "gan day", "hien tai", "hom nay", "bay gio", "vua qua", "cap nhat",
  "latest", "recent", "currently", "current", "today", "right now", "up to date",
  "tin moi", "tin tuc", "news", "gia hom nay", "lich hom nay", "phien ban moi",
  "release moi", "luat moi", "quy dinh moi", "xu huong", "trend",
];

const LOCAL_SIGNALS = [
  "gan toi", "gan studio", "dia diem", "quan an", "nha hang", "cua hang",
  "near me", "nearby", "local search", "restaurant", "place to",
];

const NEWS_SIGNALS = ["tin ai", "tin ve", "tin tuc", "news", "bao chi", "thong cao", "announcement", "press release", "tin moi"];

const STABLE_ONLY = [
  "la gi", "dinh nghia", "giai thich khai niem", "what is", "define", "meaning of",
];

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

export function classifyMoodieResearchIntent(prompt: string): MoodieResearchIntent {
  const text = normalize(prompt);
  const explicit = includesAny(text, EXPLICIT_RESEARCH);
  const local = includesAny(text, LOCAL_SIGNALS);
  const current = includesAny(text, CURRENT_SIGNALS);
  const stableOnly = includesAny(text, STABLE_ONLY) && !current && !explicit;
  const mode: MoodieResearchMode = local
    ? "local"
    : includesAny(text, NEWS_SIGNALS)
      ? "news"
      : "web";

  if (explicit || local) {
    return { required: true, requested: explicit, mode, freshness: current ? "current" : "recent", reason: explicit ? "explicit_external_research" : "local_external_search" };
  }
  if (current) {
    return { required: true, requested: false, mode, freshness: "current", reason: "current_external_fact" };
  }
  if (stableOnly) {
    return { required: false, requested: false, mode: "web", freshness: "stable", reason: "stable_knowledge" };
  }
  return { required: false, requested: false, mode: "web", freshness: "stable", reason: "no_external_signal" };
}
