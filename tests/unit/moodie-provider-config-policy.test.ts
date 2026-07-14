import {
  canReuseProviderKey,
  isLocalProviderBaseUrl,
  normalizeProviderApiKey,
  normalizeProviderBaseUrl,
  providerNeedsApiKey,
} from "@/lib/moodie/providers/config-policy";

describe("Moodie provider configuration policy", () => {
  it("normalizes trailing slashes before comparing endpoints", () => {
    expect(normalizeProviderBaseUrl(" https://integrate.api.nvidia.com/v1/ "))
      .toBe("https://integrate.api.nvidia.com/v1");
  });

  it("removes an accidental Bearer prefix before storing or sending a provider key", () => {
    expect(normalizeProviderApiKey("  Bearer nvapi-example  ")).toBe("nvapi-example");
    expect(normalizeProviderApiKey("nvapi-example")).toBe("nvapi-example");
  });

  it("requires keys for cloud providers but not localhost providers", () => {
    expect(providerNeedsApiKey("openai_compatible", "https://integrate.api.nvidia.com/v1")).toBe(true);
    expect(providerNeedsApiKey("openai_compatible", "http://localhost:11434/v1")).toBe(false);
    expect(providerNeedsApiKey("gemini")).toBe(true);
    expect(isLocalProviderBaseUrl("http://127.0.0.1:1234/v1")).toBe(true);
  });

  it("reuses a saved key only for the same provider and endpoint", () => {
    const base = {
      hasKey: true,
      currentProviderId: "openai_compatible" as const,
      currentBaseUrl: "https://api.openai.com/v1",
      nextProviderId: "openai_compatible" as const,
    };

    expect(canReuseProviderKey({ ...base, nextBaseUrl: "https://api.openai.com/v1/" })).toBe(true);
    expect(canReuseProviderKey({ ...base, nextBaseUrl: "https://integrate.api.nvidia.com/v1" })).toBe(false);
    expect(canReuseProviderKey({ ...base, nextProviderId: "gemini", nextBaseUrl: "" })).toBe(false);
  });
});
