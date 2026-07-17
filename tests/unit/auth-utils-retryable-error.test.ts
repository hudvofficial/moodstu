jest.mock("next/headers", () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}));

import { describe, expect, it } from "@jest/globals";
import { isRetryableEmployeeContextError } from "@/lib/auth_utils";

describe("isRetryableEmployeeContextError", () => {
  it("retries known Supabase schema-cache errors", () => {
    expect(isRetryableEmployeeContextError({ code: "PGRST002" })).toBe(true);
    expect(isRetryableEmployeeContextError({ code: "PGRST003" })).toBe(true);
    expect(isRetryableEmployeeContextError({ message: "Schema cache is stale" })).toBe(true);
    expect(isRetryableEmployeeContextError({ message: "Retrying request" })).toBe(true);
  });

  it("retries upstream request timeout errors (regression: seen repeatedly in production Sentry 17/07)", () => {
    expect(isRetryableEmployeeContextError({ message: "upstream request timeout" })).toBe(true);
    expect(isRetryableEmployeeContextError({ message: "Upstream Request Timeout" })).toBe(true);
  });

  it("does not retry unrelated or missing errors", () => {
    expect(isRetryableEmployeeContextError(null)).toBe(false);
    expect(isRetryableEmployeeContextError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(false);
    expect(isRetryableEmployeeContextError({ message: "permission denied for table employees" })).toBe(false);
  });
});
