import type { ProviderMessage } from "@/lib/moodie/providers/types";
import type { MoodieIntentRoute } from "@/lib/moodie/intent-router";

export type MoodieAnswerVerification =
  | { ok: true }
  | { ok: false; correctiveInstruction: string };

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function verifyMoodieAnswer(params: {
  userPrompt: string;
  route: MoodieIntentRoute;
  assistantMessage: ProviderMessage;
  toolUsedInTurn: boolean;
  correctionCount: number;
}): MoodieAnswerVerification {
  const prompt = normalizeText(params.userPrompt);
  const asksIdentity = /(ban la ai|ten ban la gi|ban ten gi|may la ai|who are you)/.test(prompt);
  const identityAnswer = normalizeText(params.assistantMessage.content || "");
  const hasMoodieIdentity = identityAnswer.includes("moodie") && (identityAnswer.includes("mood studio") || identityAnswer.includes("studio") || identityAnswer.includes("tro ly van hanh"));
  if (asksIdentity && !hasMoodieIdentity) {
    if (params.correctionCount >= 1) return { ok: true };
    return {
      ok: false,
      correctiveInstruction: "Bạn vừa được hỏi về danh tính. Hãy trả lời trực tiếp: Mình là Moodie, trợ lý vận hành của Mood Studio. Không mô tả mình như một trợ lý AI chung chung.",
    };
  }

  if (!params.route.needsData) {
    return { ok: true };
  }

  if (params.toolUsedInTurn) {
    return { ok: true };
  }

  if (params.correctionCount >= 1) {
    return { ok: true };
  }

  const content = normalizeText(params.assistantMessage.content || "");
  const looksLikeClarifyingQuestion = content.endsWith("?") || content.startsWith("ban can") || content.startsWith("cho minh") || content.startsWith("mình cần") || content.startsWith("can them");

  if (looksLikeClarifyingQuestion) {
    return { ok: true };
  }

  return {
    ok: false,
    correctiveInstruction:
      "Yêu cầu này cần dữ liệu thật từ hệ thống. Không được trả lời theo suy đoán. Hãy gọi một tool phù hợp trước, hoặc hỏi người dùng một câu rất ngắn để làm rõ.",
  };
}
