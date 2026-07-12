import { describe, expect, it } from "@jest/globals";
import {
  isMoodieMemoryRecallEligible,
  moodieMemoryReviewPolicy,
} from "@/lib/moodie/memory-lifecycle";

describe("Moodie memory v3 lifecycle", () => {
  const now = new Date("2026-07-12T04:00:00.000Z");

  it("uses shorter review windows for episodic memory than identity", () => {
    const identity = moodieMemoryReviewPolicy("identity", now);
    const episodic = moodieMemoryReviewPolicy("episodic", now);
    expect(identity.reconfirmationIntervalDays).toBe(365);
    expect(episodic.reconfirmationIntervalDays).toBe(30);
    expect(Date.parse(identity.reviewAfter)).toBeGreaterThan(Date.parse(episodic.reviewAfter));
  });

  it("recalls only active, unexpired, not-yet-due memories", () => {
    expect(isMoodieMemoryRecallEligible({ status: "active", now })).toBe(true);
    expect(isMoodieMemoryRecallEligible({ status: "needs_confirmation", now })).toBe(false);
    expect(isMoodieMemoryRecallEligible({ status: "active", expiresAt: "2026-07-12T03:59:00.000Z", now })).toBe(false);
    expect(isMoodieMemoryRecallEligible({ status: "active", reviewAfter: "2026-07-12T03:59:00.000Z", now })).toBe(false);
    expect(isMoodieMemoryRecallEligible({ status: "active", reviewAfter: "2026-07-13T04:00:00.000Z", now })).toBe(true);
  });
});
