import { validateMoodieMemoryCandidate, type MoodieMemoryCandidate } from "@/lib/moodie/memory-policy";

const EXPLICIT_MEMORY_PATTERN = /^(?:hãy nhớ|ghi nhớ|nhớ rằng|từ giờ|từ nay|mình thích|tôi thích|ưu tiên|đừng|không được)(?=[,:\s-]|$)[,:\s-]*(.+)$/i;

export function extractMoodieMemoryCandidate(params: {
  prompt: string;
  conversationId: string;
  sourceMessageId: string;
}): MoodieMemoryCandidate | null {
  const prompt = params.prompt.replace(/\s+/g, " ").trim();
  const match = prompt.match(EXPLICIT_MEMORY_PATTERN);
  if (!match) return null;

  const instruction = match[1]?.trim() || prompt;
  const candidate: MoodieMemoryCandidate = {
    scope: "user",
    memoryType: /thích|ưu tiên/i.test(prompt) ? "preference" : "instruction",
    content: instruction,
    confidence: 0.95,
    conversationId: params.conversationId,
    sourceMessageId: params.sourceMessageId,
  };
  const validation = validateMoodieMemoryCandidate(candidate);
  return validation.ok ? validation.candidate : null;
}
