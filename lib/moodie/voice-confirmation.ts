const EXPLICIT_CONFIRMATION = /^(?:vâng|ừ|uh|ok|okay|được|đồng ý|xác nhận|làm đi|tiến hành|chốt|yes|confirm)(?:\s+(?:đi|nhé|nha|ạ|luôn|giúp mình|giúp tôi))*[.!?\s]*$/i;
const NEGATION = /\b(?:không|chưa|đừng|thôi|hủy|huỷ|no|not|don't|do not)\b/i;

export function isExplicitMoodieVoiceConfirmation(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 && normalized.length <= 80
    && !NEGATION.test(normalized)
    && EXPLICIT_CONFIRMATION.test(normalized);
}
