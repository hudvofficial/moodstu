const MOODIE_MISSING_TABLE_PATTERNS = [
  /Could not find the table/i,
  /schema cache/i,
  /ai_conversations/i,
  /ai_messages/i,
];

export const MOODIE_MIGRATION_PATH = "supabase/migrations/20260418160000_create_moodie_tables.sql";
const MOODIE_SETUP_ERROR_NAME = "MoodieSetupError";

export function isMissingMoodieTablesError(
  error: { code?: string; message?: string; details?: string } | null | undefined,
) {
  if (!error) return false;
  if (error.code === "PGRST205") return true;

  const haystack = `${error.message || ""} ${error.details || ""}`;
  return MOODIE_MISSING_TABLE_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function getMoodieSetupMessage() {
  return `Moodie chưa được khởi tạo dữ liệu trên database hiện tại. Cần chạy migration ${MOODIE_MIGRATION_PATH}.`;
}

export function createMoodieSetupError() {
  const error = new Error(getMoodieSetupMessage());
  error.name = MOODIE_SETUP_ERROR_NAME;
  return error;
}

export function isMoodieSetupError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { name?: string; message?: string };
  return candidate.name === MOODIE_SETUP_ERROR_NAME || candidate.message === getMoodieSetupMessage();
}
