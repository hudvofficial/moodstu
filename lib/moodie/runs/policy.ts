export type MoodieRunKind = "task" | "research" | "action";

const CONSEQUENTIAL_ACTION_PATTERN = /(?:create|update|delete|send|publish|approve|cancel|refund|pay|write|move|rename|archive|tạo|sửa|xoá|xóa|gửi|duyệt|huỷ|hủy|thanh toán|hoàn tiền)/i;

export function requiresMoodieRunConfirmation(input: {
  kind: MoodieRunKind;
  toolName?: string | null;
  readOnly?: boolean;
}) {
  if (input.kind === "action") return true;
  if (input.readOnly === true || input.kind === "research") return false;
  return CONSEQUENTIAL_ACTION_PATTERN.test(input.toolName || "");
}

export function canStartMoodieRun(input: {
  requiresConfirmation: boolean;
  confirmedAt?: string | null;
  confirmationExpiresAt?: string | null;
  now?: Date;
}) {
  if (!input.requiresConfirmation) return true;
  if (!input.confirmedAt) return false;
  if (!input.confirmationExpiresAt) return true;
  return Date.parse(input.confirmationExpiresAt) > (input.now || new Date()).getTime();
}
