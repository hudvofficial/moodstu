import type { MoodieMemoryType } from "@/lib/moodie/memory-policy";

const RECONFIRM_DAYS: Partial<Record<MoodieMemoryType, number>> = {
  identity: 365,
  preference: 365,
  instruction: 365,
  goal: 90,
  project: 90,
  decision: 180,
  relationship: 180,
  episodic: 30,
  fact: 90,
  studio_knowledge: 180,
  summary: 90,
};

export function moodieMemoryReviewPolicy(memoryType: MoodieMemoryType, confirmedAt = new Date()) {
  const intervalDays = RECONFIRM_DAYS[memoryType] || 90;
  return {
    reconfirmationIntervalDays: intervalDays,
    reviewAfter: new Date(confirmedAt.getTime() + intervalDays * 86_400_000).toISOString(),
  };
}

export function isMoodieMemoryRecallEligible(input: {
  status: string;
  expiresAt?: string | null;
  reviewAfter?: string | null;
  now?: Date;
}) {
  const now = (input.now || new Date()).getTime();
  return input.status === "active"
    && (!input.expiresAt || Date.parse(input.expiresAt) > now)
    && (!input.reviewAfter || Date.parse(input.reviewAfter) > now);
}
