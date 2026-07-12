import type { MoodieMemoryScope } from "@/lib/moodie/memory-types";
import type { Json } from "@/types/database.types";

export type MoodieMemoryType = "identity" | "preference" | "instruction" | "goal" | "project" | "decision" | "relationship" | "episodic" | "studio_knowledge" | "fact" | "summary";
export type MoodieMemoryStatus = "pending" | "active" | "archived" | "deleted";

export type MoodieMemoryCandidate = {
  scope: MoodieMemoryScope;
  memoryType: MoodieMemoryType;
  content: string;
  confidence: number;
  importance?: number;
  subject?: string;
  predicate?: string;
  value?: Json;
  sourceMessageId?: string;
  sourceMessageIds?: string[];
  sourceVoiceTurnId?: string;
  conversationId?: string;
  autoActivate?: boolean;
};

const SECRET_PATTERN = /(?:api[_ -]?key|password|token|secret|bearer|sk-[a-z0-9])/i;
const LIVE_DATA_PATTERN = /(?:₫|vnd|\$|€|\d{4,}|doanh thu|công nợ|cong no|lịch|lich|hợp đồng|hop dong|số dư|so du)/i;

export function validateMoodieMemoryCandidate(candidate: MoodieMemoryCandidate) {
  const content = candidate.content.replace(/\s+/g, " ").trim();
  if (!content || content.length > 1000) return { ok: false as const, reason: "empty_or_too_long" };
  if (SECRET_PATTERN.test(content)) return { ok: false as const, reason: "sensitive_secret" };
  if (LIVE_DATA_PATTERN.test(content)) return { ok: false as const, reason: "mutable_business_data" };
  if (candidate.confidence < 0 || candidate.confidence > 1) return { ok: false as const, reason: "invalid_confidence" };
  if (candidate.importance !== undefined && (candidate.importance < 0 || candidate.importance > 1)) return { ok: false as const, reason: "invalid_importance" };
  if (candidate.scope === "conversation" && !candidate.conversationId) return { ok: false as const, reason: "conversation_scope_requires_id" };

  return {
    ok: true as const,
    candidate: {
      ...candidate,
      content,
      importance: candidate.importance ?? 0.5,
      subject: candidate.subject || (candidate.scope === "studio" ? "studio" : "user"),
      predicate: candidate.predicate || `memory.${candidate.memoryType}`,
      value: candidate.value ?? { text: content },
      sourceMessageIds: candidate.sourceMessageIds || (candidate.sourceMessageId ? [candidate.sourceMessageId] : []),
      status: candidate.autoActivate ? "active" as const : "pending" as const,
    },
  };
}

export function buildMoodieMemoryContext(memories: Array<{ scope: MoodieMemoryScope; memoryType: MoodieMemoryType; content: string }>) {
  const eligible = memories.filter((memory) => memory.content.trim()).slice(0, 5);
  if (eligible.length === 0) return "";

  return [
    "Ghi nhớ dài hạn đã được người dùng duyệt (chỉ dùng như sở thích/chỉ dẫn ổn định; dữ liệu thay đổi phải kiểm tra bằng tool):",
    ...eligible.map((memory) => "- [" + memory.scope + "/" + memory.memoryType + "] " + memory.content),
  ].join("\n");
}
