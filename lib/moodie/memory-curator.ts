import { validateMoodieMemoryCandidate, type MoodieMemoryCandidate, type MoodieMemoryType } from "@/lib/moodie/memory-policy";
import { getActiveMoodieProvider } from "@/lib/moodie/providers/registry";

type CuratorInput = {
  prompt: string;
  conversationId: string;
  sourceMessageId?: string;
  sourceVoiceTurnId?: string;
};

type CandidateTemplate = Omit<MoodieMemoryCandidate, "scope" | "confidence" | "sourceMessageId" | "sourceMessageIds" | "conversationId"> & {
  match: RegExpMatchArray;
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
}

function templateForPrompt(prompt: string): CandidateTemplate | null {
  const preference = prompt.match(/^(?:hãy nhớ|ghi nhớ|nhớ rằng|từ giờ|từ nay|mình thích|tôi thích|ưu tiên|đừng|không được)(?:[,\s:-]+)(.+)$/i);
  if (preference) {
    const content = compact(preference[1] || "");
    const isPreference = /^(?:mình thích|tôi thích|ưu tiên)/i.test(prompt);
    return {
      match: preference,
      memoryType: isPreference ? "preference" : "instruction",
      content,
      importance: 0.8,
      subject: "user",
      predicate: isPreference ? "presentation.preference" : "assistant.instruction",
      value: { text: content },
      autoActivate: true,
    };
  }

  const goal = prompt.match(/^(?:mục tiêu(?: của mình| của tôi)? là|mình muốn moodie|chúng ta cần|hãy đồng hành với mình để)(?:[,\s:-]+)(.+)$/i);
  if (goal) {
    const content = compact(goal[1] || "");
    return { match: goal, memoryType: "goal", content, importance: 0.95, subject: "user", predicate: "goal.objective", value: { objective: content, status: "active" }, autoActivate: true };
  }

  const decision = prompt.match(/^(?:chốt|mình quyết định|quyết định là|thống nhất)(?:[,\s:-]+)(.+)$/i);
  if (decision) {
    const content = compact(decision[1] || "");
    return { match: decision, memoryType: "decision", content, importance: 0.9, subject: "user", predicate: "decision.outcome", value: { outcome: content }, autoActivate: true };
  }

  const project = prompt.match(/^(?:dự án hiện tại là|project hiện tại là|chúng ta đang làm|mình đang triển khai)(?:[,\s:-]+)(.+)$/i);
  if (project) {
    const content = compact(project[1] || "");
    return { match: project, memoryType: "project", content, importance: 0.9, subject: "user", predicate: "project.active", value: { name: content, status: "active" }, autoActivate: true };
  }

  return null;
}

export function curateMoodieMemories(input: CuratorInput) {
  const prompt = compact(input.prompt);
  const template = templateForPrompt(prompt);
  if (!template || !template.content) return [];
  const { match: _match, ...candidateData } = template;
  void _match;
  const validation = validateMoodieMemoryCandidate({
    ...candidateData,
    scope: "user",
    confidence: 0.98,
    conversationId: input.conversationId,
    sourceMessageId: input.sourceMessageId,
    sourceMessageIds: input.sourceMessageId ? [input.sourceMessageId] : [],
    sourceVoiceTurnId: input.sourceVoiceTurnId,
  });
  return validation.ok ? [validation.candidate] : [];
}

const MODEL_MEMORY_TYPES = new Set<MoodieMemoryType>([
  "identity", "preference", "instruction", "goal", "project", "decision", "relationship", "episodic",
]);

function extractJsonArray(value: string) {
  const start = value.indexOf("[");
  const end = value.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(value.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function curateMoodieMemoriesWithModel(input: CuratorInput) {
  const deterministic = curateMoodieMemories(input);
  if (deterministic.length > 0) return deterministic;
  try {
    const provider = await getActiveMoodieProvider();
    if (!provider) return [];
    const result = await provider.chat([
      {
        role: "system",
        content: [
          "Extract only durable user memory from the latest Vietnamese message.",
          "Return a JSON array only. Each item: type, content, subject, predicate, confidence, importance, explicit.",
          "Allowed types: identity, preference, instruction, goal, project, decision, relationship, episodic.",
          "Do not extract current balances, schedules, contract state, secrets, temporary requests, or facts requiring live tools.",
          "Use [] when nothing durable is present. Max 3 items.",
        ].join("\n"),
      },
      { role: "user", content: input.prompt },
    ], [], { toolChoice: "none" });
    if (!result.ok || !result.message.content) return [];
    return extractJsonArray(result.message.content).slice(0, 3).flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      const memoryType = typeof item.type === "string" ? item.type as MoodieMemoryType : null;
      if (!memoryType || !MODEL_MEMORY_TYPES.has(memoryType) || typeof item.content !== "string") return [];
      const explicit = item.explicit === true;
      const validation = validateMoodieMemoryCandidate({
        scope: "user",
        memoryType,
        content: item.content,
        confidence: typeof item.confidence === "number" ? item.confidence : explicit ? 0.95 : 0.75,
        importance: typeof item.importance === "number" ? item.importance : 0.7,
        subject: typeof item.subject === "string" ? item.subject : "user",
        predicate: typeof item.predicate === "string" ? item.predicate : `memory.${memoryType}`,
        value: { text: item.content, explicit },
        conversationId: input.conversationId,
        sourceMessageId: input.sourceMessageId,
        sourceMessageIds: input.sourceMessageId ? [input.sourceMessageId] : [],
        sourceVoiceTurnId: input.sourceVoiceTurnId,
        autoActivate: explicit && ["identity", "preference", "instruction", "goal", "project", "decision"].includes(memoryType),
      });
      return validation.ok ? [validation.candidate] : [];
    });
  } catch {
    return [];
  }
}
