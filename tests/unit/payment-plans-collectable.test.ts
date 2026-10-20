import { describe, it, expect } from "@jest/globals";
import { hasCollectableBalance } from "@/lib/contracts/payment-plans";

describe("hasCollectableBalance", () => {
  it.each([
    [0, false],
    [0.005, false],
    [0.01, false],
    [0.02, true],
    [1500000, true],
    [-100, false],
  ])("remaining %p -> %p", (remaining, expected) => {
    expect(hasCollectableBalance(remaining)).toBe(expected);
  });

  it("không biết số còn nợ (null/undefined) giữ hành vi cũ: còn thu", () => {
    expect(hasCollectableBalance(null)).toBe(true);
    expect(hasCollectableBalance(undefined)).toBe(true);
  });
});
