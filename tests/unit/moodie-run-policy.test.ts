import { describe, expect, it } from "@jest/globals";
import {
  canStartMoodieRun,
  requiresMoodieRunConfirmation,
} from "@/lib/moodie/runs/policy";

describe("Moodie durable run confirmation policy", () => {
  it("does not gate read-only research", () => {
    expect(requiresMoodieRunConfirmation({ kind: "research" })).toBe(false);
    expect(requiresMoodieRunConfirmation({ kind: "task", toolName: "search_web", readOnly: true })).toBe(false);
  });

  it("gates consequential actions", () => {
    expect(requiresMoodieRunConfirmation({ kind: "action", toolName: "send_email" })).toBe(true);
    expect(requiresMoodieRunConfirmation({ kind: "task", toolName: "delete_contract" })).toBe(true);
  });

  it("requires fresh confirmation evidence before starting", () => {
    const now = new Date("2026-07-12T02:00:00.000Z");
    expect(canStartMoodieRun({ requiresConfirmation: true, now })).toBe(false);
    expect(canStartMoodieRun({
      requiresConfirmation: true,
      confirmedAt: "2026-07-12T01:59:00.000Z",
      confirmationExpiresAt: "2026-07-12T02:05:00.000Z",
      now,
    })).toBe(true);
    expect(canStartMoodieRun({
      requiresConfirmation: true,
      confirmedAt: "2026-07-12T01:00:00.000Z",
      confirmationExpiresAt: "2026-07-12T01:05:00.000Z",
      now,
    })).toBe(false);
  });
});
