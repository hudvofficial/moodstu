import type { MoodieHistoryMessage } from "@/types/moodie";

const MAX_SUMMARY_MESSAGES = 10;
const MAX_SUMMARY_CHARS = 2_000;

function compact(text: string, limit: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : normalized.slice(0, limit - 1).trimEnd() + "…";
}

export function buildMoodieConversationSummary(history: MoodieHistoryMessage[], previousSummary?: string | null) {
  const lines = history
    .filter((message) => message.content.trim())
    .slice(-MAX_SUMMARY_MESSAGES)
    .map((message) => (message.role === "user" ? "Người dùng: " : "Moodie: ") + compact(message.content, 320));

  const previous = previousSummary?.trim();
  const sections = previous
    ? ["Tóm tắt trước:\n" + compact(previous, 900), "Diễn biến gần đây:\n" + lines.join("\n")]
    : [lines.join("\n")];
  return compact(sections.join("\n\n"), MAX_SUMMARY_CHARS);
}

export function buildMoodieConversationSummaryContext(summary?: string | null) {
  const content = summary?.trim();
  if (!content) return "";
  return "Tóm tắt hội thoại trước đó (chỉ dùng để nối ngữ cảnh, không thay thế dữ liệu live):\n" + content;
}
