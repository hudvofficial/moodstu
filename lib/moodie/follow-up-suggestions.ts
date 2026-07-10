import type { MoodieConversationDetail, MoodieMessage } from "@/types/moodie";

function unique(items: string[]) {
  return [...new Set(items.filter((item) => item.trim().length > 0))].slice(0, 4);
}

export function getSmartMoodieFollowUps(params: {
  conversation: MoodieConversationDetail | null;
  defaultSuggestions: string[];
}) {
  const lastAssistant = [...(params.conversation?.messages || [])]
    .reverse()
    .find((message) => message.role === "assistant") as MoodieMessage | undefined;

  const trace = lastAssistant?.metadata?.trace;
  const widgets = lastAssistant?.metadata?.widgets || [];

  const suggestions: string[] = [
    ...(lastAssistant?.metadata?.follow_ups || []),
  ];

  if (trace?.route_intent === "finance") {
    suggestions.push("Cho mình 3 rủi ro tài chính lớn nhất hiện tại");
    suggestions.push("Gợi ý hành động ưu tiên trong 7 ngày tới");
  }

  if (trace?.route_intent === "contracts") {
    suggestions.push("Chỉ ra hợp đồng nào cần theo dõi ngay");
    suggestions.push("Tóm tắt tình trạng thanh toán và lịch chụp liên quan");
  }

  if (trace?.route_intent === "codebase") {
    suggestions.push("Chỉ rõ file và hàm cần đọc tiếp");
    suggestions.push("Giải thích luồng này theo từng bước");
  }

  if (widgets.length > 0) {
    suggestions.push("Tóm tắt insight chính từ các chỉ số trên");
  }

  return unique([...suggestions, ...params.defaultSuggestions]);
}
