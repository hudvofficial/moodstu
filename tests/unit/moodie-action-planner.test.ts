import { describe, expect, it } from "@jest/globals";
import { planMoodieSafeNavigation } from "@/lib/moodie/action-planner";

describe("Moodie safe navigation planner", () => {
  it("creates a read-only navigation preview for an authorized user", () => {
    expect(planMoodieSafeNavigation({
      prompt: "Mở trang công nợ giúp mình",
      role: "manager",
    })).toMatchObject({
      kind: "navigate",
      href: "/finance/debts",
      requires_approval: false,
      risk: "none",
    });
  });

  it("does not create a navigation action for a non-navigation request", () => {
    expect(planMoodieSafeNavigation({
      prompt: "Công nợ hiện tại thế nào?",
      role: "manager",
    })).toBeNull();
  });

  it("does not leak unauthorized finance navigation", () => {
    expect(planMoodieSafeNavigation({
      prompt: "Mở trang công nợ",
      role: "viewer",
    })).toBeNull();
  });
});
