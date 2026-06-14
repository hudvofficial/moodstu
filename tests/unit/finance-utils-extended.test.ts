import { describe, it, expect } from "@jest/globals";
import {
  monthWindow,
  monthWindowOptional,
  firstDayOfMonth,
  relationText,
  asString,
  readMoney,
  isMissingRpcError,
} from "@/lib/finance-utils";

describe("monthWindow", () => {
  it("returns correct window for January", () => {
    expect(monthWindow(1, 2026)).toEqual({ start: "2026-01-01", end: "2026-02-01" });
  });

  it("returns correct window for June", () => {
    expect(monthWindow(6, 2026)).toEqual({ start: "2026-06-01", end: "2026-07-01" });
  });

  it("handles December → January year rollover", () => {
    expect(monthWindow(12, 2025)).toEqual({ start: "2025-12-01", end: "2026-01-01" });
  });

  it("pads single-digit month", () => {
    const { start } = monthWindow(3, 2026);
    expect(start).toBe("2026-03-01");
  });
});

describe("monthWindowOptional", () => {
  it("returns null when month is undefined", () => {
    expect(monthWindowOptional(undefined, 2026)).toBeNull();
  });

  it("returns null when year is undefined", () => {
    expect(monthWindowOptional(6, undefined)).toBeNull();
  });

  it("returns null when both are undefined", () => {
    expect(monthWindowOptional(undefined, undefined)).toBeNull();
  });

  it("returns null when month is 0 (falsy)", () => {
    expect(monthWindowOptional(0, 2026)).toBeNull();
  });

  it("returns monthWindow result when both provided", () => {
    expect(monthWindowOptional(6, 2026)).toEqual({ start: "2026-06-01", end: "2026-07-01" });
  });
});

describe("firstDayOfMonth", () => {
  it("returns YYYY-MM-01 format", () => {
    expect(firstDayOfMonth(1, 2026)).toBe("2026-01-01");
    expect(firstDayOfMonth(12, 2026)).toBe("2026-12-01");
  });

  it("pads single-digit month with zero", () => {
    expect(firstDayOfMonth(3, 2026)).toBe("2026-03-01");
    expect(firstDayOfMonth(9, 2026)).toBe("2026-09-01");
  });
});

describe("relationText", () => {
  it("extracts text from plain object", () => {
    expect(relationText({ name: "foo" }, "name")).toBe("foo");
  });

  it("extracts text from single-element array", () => {
    expect(relationText([{ name: "bar" }], "name")).toBe("bar");
  });

  it("returns null for empty array", () => {
    expect(relationText([], "name")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(relationText(null, "name")).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(relationText(undefined, "name")).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(relationText("string", "name")).toBeNull();
    expect(relationText(123, "name")).toBeNull();
  });

  it("returns null when key does not exist", () => {
    expect(relationText({ name: "foo" }, "missing")).toBeNull();
  });

  it("returns null when value for key is not a string", () => {
    expect(relationText({ count: 42 }, "count")).toBeNull();
  });
});

describe("asString", () => {
  it("returns string value as-is", () => {
    expect(asString("hello")).toBe("hello");
  });

  it("returns empty string for empty string input", () => {
    expect(asString("")).toBe("");
  });

  it("returns default fallback for non-string", () => {
    expect(asString(123)).toBe("");
    expect(asString(null)).toBe("");
    expect(asString(undefined)).toBe("");
  });

  it("returns custom fallback", () => {
    expect(asString(null, "N/A")).toBe("N/A");
    expect(asString(42, "default")).toBe("default");
  });
});

describe("readMoney", () => {
  it("returns không đồng for 0", () => {
    expect(readMoney(0)).toBe("không đồng");
  });

  it("reads thousands", () => {
    expect(readMoney(1000)).toBe("Một nghìn đồng chẵn.");
  });

  it("reads millions", () => {
    expect(readMoney(1000000)).toBe("Một triệu đồng chẵn.");
  });

  it("reads billions (tỷ)", () => {
    expect(readMoney(1000000000)).toBe("Một tỷ đồng chẵn.");
  });

  it("handles lẻ case (zero tens with nonzero units)", () => {
    const result = readMoney(101);
    expect(result).toContain("lẻ");
    expect(result.toLowerCase()).toContain("một trăm");
  });

  it("handles mốt (unit 1 with tens > 1)", () => {
    const result = readMoney(21);
    expect(result).toContain("mốt");
  });

  it("handles lăm (unit 5 with tens > 0)", () => {
    const result = readMoney(15);
    expect(result).toContain("lăm");
  });

  it("uses năm (not lăm) when tens is 0", () => {
    const result = readMoney(5);
    expect(result.toLowerCase()).toContain("năm");
    expect(result).not.toContain("lăm");
  });

  it("reads complex number with proper grouping", () => {
    const result = readMoney(1234567);
    expect(result).toContain("triệu");
    expect(result).toContain("nghìn");
    expect(result).toContain("đồng chẵn.");
  });

  it("starts with uppercase", () => {
    const result = readMoney(500);
    expect(result[0]).toBe(result[0].toUpperCase());
  });

  it("ends with đồng chẵn.", () => {
    expect(readMoney(999)).toMatch(/đồng chẵn\.$/);
  });
});

describe("isMissingRpcError", () => {
  it("returns true for PGRST202 code", () => {
    expect(isMissingRpcError({ code: "PGRST202" })).toBe(true);
  });

  it("returns true for 'schema cache' message", () => {
    expect(isMissingRpcError({ message: "schema cache lookup failed" })).toBe(true);
  });

  it("returns true for 'function' message", () => {
    expect(isMissingRpcError({ message: "function not found in schema" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isMissingRpcError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isMissingRpcError(undefined)).toBe(false);
  });

  it("returns false for other error codes", () => {
    expect(isMissingRpcError({ code: "PGRST301", message: "some error" })).toBe(false);
  });

  it("returns false for empty error object", () => {
    expect(isMissingRpcError({})).toBe(false);
  });
});
