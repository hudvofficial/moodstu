import { describe, it, expect } from "@jest/globals";
import {
  formatCurrency,
  formatVnd,
  safeFormatDate,
  parseIntOrNull,
  getInitials,
  formatPhone,
  CURRENCY_SYMBOL,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats number with vi-VN locale separators", () => {
    const result = formatCurrency(1000000);
    expect(result).toMatch(/1[\.\s]000[\.\s]000/);
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0");
  });

  it("handles null → 0", () => {
    expect(formatCurrency(null)).toBe("0");
  });

  it("handles undefined → 0", () => {
    expect(formatCurrency(undefined)).toBe("0");
  });

  it("handles NaN → 0 (falsy coercion)", () => {
    expect(formatCurrency(NaN)).toBe("0");
  });

  it("handles negative numbers", () => {
    const result = formatCurrency(-1000);
    expect(result).toContain("1");
    expect(result).toContain("-");
  });

  it("handles Infinity → 0", () => {
    expect(formatCurrency(Infinity)).toBe("0");
  });
});

describe("formatVnd", () => {
  it("appends currency symbol", () => {
    const result = formatVnd(1000000);
    expect(result).toContain(CURRENCY_SYMBOL);
  });

  it("handles null", () => {
    const result = formatVnd(null);
    expect(result).toContain("0");
    expect(result).toContain(CURRENCY_SYMBOL);
  });

  it("handles zero", () => {
    const result = formatVnd(0);
    expect(result).toBe(`0 ${CURRENCY_SYMBOL}`);
  });
});

describe("safeFormatDate", () => {
  it("formats ISO date string with default pattern", () => {
    expect(safeFormatDate("2026-06-13")).toBe("13/06/2026");
  });

  it("formats Date object", () => {
    const d = new Date(2026, 5, 13);
    expect(safeFormatDate(d)).toBe("13/06/2026");
  });

  it("returns dash for null", () => {
    expect(safeFormatDate(null)).toBe("-");
  });

  it("returns dash for undefined", () => {
    expect(safeFormatDate(undefined)).toBe("-");
  });

  it("returns dash for empty string", () => {
    expect(safeFormatDate("")).toBe("-");
  });

  it("returns dash for invalid date string", () => {
    expect(safeFormatDate("not-a-date")).toBe("-");
  });

  it("supports custom pattern", () => {
    expect(safeFormatDate("2026-06-13", "yyyy-MM-dd")).toBe("2026-06-13");
  });
});

describe("parseIntOrNull", () => {
  it("parses valid integer string", () => {
    expect(parseIntOrNull("123")).toBe(123);
  });

  it("parses string with trailing text", () => {
    expect(parseIntOrNull("42px")).toBe(42);
  });

  it("returns null for null", () => {
    expect(parseIntOrNull(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseIntOrNull(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseIntOrNull("")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parseIntOrNull("abc")).toBeNull();
  });
});

describe("getInitials", () => {
  it("gets last 2 initials from full name", () => {
    expect(getInitials("Nguyen Van A")).toBe("VA");
  });

  it("returns single letter for single word", () => {
    expect(getInitials("Admin")).toBe("A");
  });

  it("returns ? for null", () => {
    expect(getInitials(null)).toBe("?");
  });

  it("uppercases result", () => {
    expect(getInitials("nguyen van a")).toBe("VA");
  });

  it("handles two-word name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });
});

describe("formatPhone", () => {
  it("formats 10-digit Vietnamese phone number", () => {
    expect(formatPhone("0901234001")).toBe("0901 234 001");
  });

  it("returns non-10-digit phone as-is", () => {
    expect(formatPhone("123456")).toBe("123456");
    expect(formatPhone("012345678901")).toBe("012345678901");
  });

  it("strips non-digit chars before formatting", () => {
    expect(formatPhone("090-123-4001")).toBe("0901 234 001");
  });

  it("handles already-formatted phone", () => {
    expect(formatPhone("0901 234 001")).toBe("0901 234 001");
  });
});
