import type { MoodieTurnActivity, MoodieTurnStage } from "@/types/moodie";

const PHASE_LABELS: Record<MoodieTurnStage, string> = {
  accepted: "Đang hiểu yêu cầu",
  routing: "Đang hiểu yêu cầu",
  context: "Đang tìm ngữ cảnh",
  planning: "Đang lên kế hoạch",
  tool: "Đang tra dữ liệu",
  generating: "Đang soạn câu trả lời",
  saving: "Đang hoàn tất",
  completed: "Đã hoàn tất",
  failed: "Có bước xử lý gặp lỗi",
  cancelled: "Đã dừng phản hồi",
};

const INTERNAL_LABEL_PATTERN = /(?:get_|tool|provider|model|execution_plan|route|agent_id|context\.|generation\.)/i;

export interface MoodieActivityPresentation {
  phaseLabel: string;
  details: MoodieTurnActivity[];
  expandable: boolean;
  failed: boolean;
  completed: boolean;
}

function isMeaningfulDetail(activity: MoodieTurnActivity) {
  if (activity.state === "error") return true;
  if (activity.stage === "tool") return true;
  return activity.durationMs !== undefined && activity.durationMs >= 750;
}

export function getMoodieActivityPhaseLabel(stage?: MoodieTurnStage | null) {
  return PHASE_LABELS[stage || "accepted"];
}

export function getMoodieActivityDetailLabel(activity: MoodieTurnActivity) {
  if (INTERNAL_LABEL_PATTERN.test(activity.label)) {
    if (activity.state === "error") return "Không thể hoàn tất bước xử lý";
    return PHASE_LABELS[activity.stage];
  }
  return activity.label;
}

export function presentMoodieActivity(
  activities: MoodieTurnActivity[],
  stage?: MoodieTurnStage | null,
): MoodieActivityPresentation {
  const current = activities.at(-1);
  const effectiveStage = current?.stage || stage || "accepted";
  const details = activities.filter(isMeaningfulDetail).slice(-12);

  return {
    phaseLabel: getMoodieActivityPhaseLabel(effectiveStage),
    details,
    expandable: details.length >= 2 || details.some((activity) => activity.state === "error"),
    failed: current?.state === "error" || effectiveStage === "failed",
    completed: current?.state === "done" || effectiveStage === "completed",
  };
}
