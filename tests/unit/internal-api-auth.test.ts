jest.mock("server-only", () => ({}));

import { isAuthorizedInternalRequest } from "@/lib/internal-api-auth";

describe("isAuthorizedInternalRequest", () => {
  it("fails closed when the secret is missing", () => {
    expect(isAuthorizedInternalRequest("Bearer value", undefined)).toBe(false);
  });

  it("rejects missing, malformed and incorrect bearer values", () => {
    expect(isAuthorizedInternalRequest(null, "secret")).toBe(false);
    expect(isAuthorizedInternalRequest("secret", "secret")).toBe(false);
    expect(isAuthorizedInternalRequest("Bearer wrong", "secret")).toBe(false);
  });

  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedInternalRequest("Bearer secret", "secret")).toBe(true);
  });
});
