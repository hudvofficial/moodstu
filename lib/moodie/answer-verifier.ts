import type { ProviderMessage } from "@/lib/moodie/providers/types";
import type { MoodieIntentRoute } from "@/lib/moodie/intent-router";

export type MoodieAnswerVerification =
  | { ok: true; replacementContent?: string }
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
  externalResearchUsed?: boolean;
  externalSourceCount?: number;
  backgroundResearchStarted?: boolean;
  correctionCount: number;
  authenticatedUser?: { fullName: string; role: string };
}): MoodieAnswerVerification {
  const prompt = normalizeText(params.userPrompt);
  const asksIdentity = /\b(ban la ai|ten ban la gi|ban ten gi|may la ai|who are you)\b/.test(prompt);
  const asksUserIdentity = /\b(ban biet (minh|toi) la ai|ban co biet (minh|toi) la ai|(minh|toi) la ai|who am i)\b/.test(prompt);
  const identityAnswer = normalizeText(params.assistantMessage.content || "");
  const namesMoodie = identityAnswer.includes("moodie");
  const statesOperationalRole = identityAnswer.includes("tro ly van hanh");
  const anchorsToMoodStudio = identityAnswer.includes("mood studio") || identityAnswer.includes("studio");
  const claimsGenericAiIdentity = /\b(tro ly ai|ai assistant|tri tue nhan tao)\b/.test(identityAnswer);
  const hasMoodieIdentity = namesMoodie && statesOperationalRole && anchorsToMoodStudio && !claimsGenericAiIdentity;
  if (asksUserIdentity && params.authenticatedUser) {
    const expectedName = normalizeText(params.authenticatedUser.fullName);
    const identifiesAuthenticatedUser = expectedName.length > 0 && identityAnswer.includes(expectedName);
    if (!identifiesAuthenticatedUser) {
      if (params.correctionCount >= 1) {
        return { ok: true, replacementContent: `Bạn đang đăng nhập với tên ${params.authenticatedUser.fullName}, vai trò ${params.authenticatedUser.role} tại Mood Studio.` };
      }
      return {
        ok: false,
        correctiveInstruction: `Người dùng đang hỏi về chính họ. Danh tính đã được xác thực từ session: tên ${params.authenticatedUser.fullName}, vai trò ${params.authenticatedUser.role}. Hãy trả lời trực tiếp từ dữ liệu này; không được nói rằng người dùng chưa giới thiệu. Không tiết lộ email hoặc ID nội bộ.`,
      };
    }
  }
  if (asksIdentity && !hasMoodieIdentity) {
    if (params.correctionCount >= 1) return { ok: true };
    return {
      ok: false,
      correctiveInstruction: "Bạn vừa được hỏi về danh tính. Hãy trả lời trực tiếp: Mình là Moodie, trợ lý vận hành của Mood Studio. Không mô tả mình như một trợ lý AI chung chung.",
    };
  }

  if (params.route.research.required) {
    if (params.route.orchestration.mode === "background_run" && params.backgroundResearchStarted) return { ok: true };
    if (params.externalResearchUsed && (params.externalSourceCount || 0) > 0) {
      const citationIndexes = [...(params.assistantMessage.content || "").matchAll(/\[(\d{1,2})\]/g)]
        .map((match) => Number(match[1]));
      const hasValidInlineCitation = citationIndexes.some((index) => index >= 1 && index <= (params.externalSourceCount || 0));
      if (hasValidInlineCitation) return { ok: true };
      const content = (params.assistantMessage.content || "").trim();
      return { ok: true, replacementContent: `${content} [1]` };
    }
    if (params.correctionCount >= 1) {
      return {
        ok: true,
        replacementContent: "Mình chưa có nguồn bên ngoài hợp lệ để kiểm chứng câu hỏi này, nên mình sẽ không đưa ra câu trả lời có thể đã cũ hoặc không chính xác. Bạn có thể thử tìm nguồn lại.",
      };
    }
    return {
      ok: false,
      correctiveInstruction: "Câu hỏi này bắt buộc cần nguồn bên ngoài mới. Hãy gọi đúng search tool đã được cấp. Chỉ trả lời sau khi có ít nhất một nguồn web hợp lệ; nếu search thất bại, nói rõ không thể kiểm chứng và không dùng kiến thức nhớ sẵn.",
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
