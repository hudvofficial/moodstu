import { describe, it, expect } from "@jest/globals";
import {
  calculatePercentage,
  calculateProgress,
  calculateChangePercentage,
  MAX_PERCENTAGE,
  MAX_CHANGE_PERCENT,
} from "@/lib/finance-constants";

describe("calculatePercentage", () => {
  it("calculates normal percentage with 1 decimal", () => {
    expect(calculatePercentage(456, 1000)).toBe(45.6);
  });

  it("returns 0 for zero numerator", () => {
    expect(calculatePercentage(0, 1000)).toBe(0);
  });

  it("returns 100 for full value", () => {
    expect(calculatePercentage(1000, 1000)).toBe(100);
  });

  it("returns 0 for zero denominator (safe division)", () => {
    expect(calculatePercentage(100, 0)).toBe(0);
  });

  it("handles fractional precision", () => {
    expect(calculatePercentage(1, 3)).toBe(33.3);
  });

  it("exceeds 100% when value > total", () => {
    expect(calculatePercentage(1500, 1000)).toBe(150);
  });

  it("handles small values", () => {
    expect(calculatePercentage(1, 1000)).toBe(0.1);
  });

  it("handles both zeros", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
  });
});

describe("calculateProgress", () => {
  it("calculates normal progress", () => {
    expect(calculateProgress(50, 100)).toBe(50);
  });

  it("caps at 100 when current exceeds target", () => {
    expect(calculateProgress(150, 100)).toBe(100);
  });

  it("returns 0 for zero progress", () => {
    expect(calculateProgress(0, 100)).toBe(0);
  });

  it("returns 0 for zero target (safe division)", () => {
    expect(calculateProgress(50, 0)).toBe(0);
  });

  it("returns 100 for exact completion", () => {
    expect(calculateProgress(100, 100)).toBe(MAX_PERCENTAGE);
  });

  it("rounds to nearest integer", () => {
    expect(calculateProgress(33, 100)).toBe(33);
    expect(calculateProgress(67, 100)).toBe(67);
  });

  it("handles both zeros", () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });
});

describe("calculateChangePercentage", () => {
  it("calculates positive change", () => {
    expect(calculateChangePercentage(150, 100)).toBe(50);
  });

  it("calculates negative change", () => {
    expect(calculateChangePercentage(50, 100)).toBe(-50);
  });

  it("returns 0 for no change", () => {
    expect(calculateChangePercentage(100, 100)).toBe(0);
  });

  it("returns 100 when previous is 0 and current > 0 (special case)", () => {
    expect(calculateChangePercentage(100, 0)).toBe(MAX_PERCENTAGE);
  });

  it("returns 0 when both are 0", () => {
    expect(calculateChangePercentage(0, 0)).toBe(0);
  });

  it("returns -100 when current drops to 0", () => {
    expect(calculateChangePercentage(0, 100)).toBe(-100);
  });

  it("caps at +1000 for huge increases", () => {
    expect(calculateChangePercentage(1000000, 1)).toBe(MAX_CHANGE_PERCENT);
  });

  it("caps at -1000 for huge decreases", () => {
    expect(calculateChangePercentage(-9000, 1000)).toBe(-MAX_CHANGE_PERCENT);
  });
});
