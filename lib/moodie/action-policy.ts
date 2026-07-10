import type { MoodieActionPreview } from "@/types/moodie";

export type MoodieApprovalState = "auto_allowed" | "pending_approval" | "blocked";

export function getMoodieApprovalState(action: MoodieActionPreview): MoodieApprovalState {
  if (action.kind === "navigate" && action.risk === "none" && !action.requires_approval) {
    return "auto_allowed";
  }
  if (action.kind !== "navigate") return "pending_approval";
  if (action.requires_approval || action.risk !== "none") return "pending_approval";
  return "blocked";
}

export function canExecuteMoodieAction(action: MoodieActionPreview, approved: boolean) {
  return getMoodieApprovalState(action) === "auto_allowed" || approved;
}
