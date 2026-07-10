import type { MoodieHistoryMessage } from "@/types/moodie";
import type { ProviderMessage } from "@/lib/moodie/providers/types";

const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 8_000;
const MAX_USER_CHARS = 1_500;
const MAX_ASSISTANT_CHARS = 1_200;

function smartTruncate(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const notice = " ... [context truncated] ... ";
  const budget = Math.max(80, maxLength - notice.length);
  const head = Math.ceil(budget * 0.65);
  const tail = Math.floor(budget * 0.35);
  return `${normalized.slice(0, head).trimEnd()}${notice}${normalized.slice(-tail).trimStart()}`;
}

function mergeSameRoleMessages(messages: MoodieHistoryMessage[]) {
  return messages.reduce<MoodieHistoryMessage[]>((merged, message) => {
    const content = message.content.trim();
    if (!content) return merged;

    const previous = merged[merged.length - 1];
    if (previous?.role === message.role) {
      previous.content = `${previous.content}\n${content}`;
      return merged;
    }

    merged.push({ role: message.role, content });
    return merged;
  }, []);
}

export function shapeMoodieHistoryForModel(history: MoodieHistoryMessage[]): ProviderMessage[] {
  const recentMessages = mergeSameRoleMessages(history).slice(-MAX_HISTORY_MESSAGES);
  const shaped: ProviderMessage[] = [];
  let totalChars = 0;

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const message = recentMessages[index];
    const maxMessageChars = message.role === "assistant" ? MAX_ASSISTANT_CHARS : MAX_USER_CHARS;
    const content = smartTruncate(message.content, maxMessageChars);

    if (totalChars + content.length > MAX_HISTORY_CHARS && shaped.length > 0) {
      break;
    }

    shaped.unshift({
      role: message.role as ProviderMessage["role"],
      content,
    });
    totalChars += content.length;
  }

  return shaped;
}
