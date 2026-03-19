/**
 * 📊 Work Status Constants — SSOT for task/work status strings
 *
 * V2 DB uses snake_case enums (task_status_enum):
 *   chua_lam | dang_lam | hoan_thanh | da_huy
 *
 * All status comparisons should use these constants, never raw strings.
 */

export const DONE_STATUSES = ["hoan_thanh"] as const;
export const IN_PROGRESS_STATUS = "dang_lam" as const;
export const CANCELLED_STATUS = "da_huy" as const;

export function isDone(status: string): boolean {
  return (DONE_STATUSES as readonly string[]).includes(status);
}
