import { describe, expect, it } from "@jest/globals";
import {
  buildMoodieAgentInstruction,
  selectMoodieAgent,
} from "@/lib/moodie/agents/profiles";

describe("Moodie Agent Core", () => {
  it("selects Studio Advisor for casual conversation", () => {
    expect(selectMoodieAgent({ intent: "general", role: "admin" }).id).toBe("studio_advisor");
  });

  it("selects Finance Analyst only for authorized finance roles", () => {
    expect(selectMoodieAgent({ intent: "finance", role: "manager" }).id).toBe("finance_analyst");
    expect(selectMoodieAgent({ intent: "finance", role: "viewer" }).id).toBe("studio_advisor");
  });

  it("creates a compact versioned instruction contract", () => {
    const profile = selectMoodieAgent({ intent: "codebase", role: "admin" });
    const instruction = buildMoodieAgentInstruction(profile);

    expect(instruction).toContain("codebase_analyst");
    expect(instruction).toContain("version: 1");
    expect(instruction).toContain("root cause");
  });
});
