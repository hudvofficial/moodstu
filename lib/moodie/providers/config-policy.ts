import type { ProviderId } from "@/lib/moodie/providers/types";

export function normalizeProviderBaseUrl(value?: string | null) {
  return (value || "").trim().replace(/\/$/, "");
}

export function normalizeProviderApiKey(value?: string | null) {
  return (value || "").trim().replace(/^Bearer\s+/i, "").trim();
}

export function isLocalProviderBaseUrl(value?: string | null) {
  const normalized = normalizeProviderBaseUrl(value).toLowerCase();
  return normalized.includes("localhost") || normalized.includes("127.0.0.1");
}

export function providerNeedsApiKey(providerId: ProviderId, baseUrl?: string | null) {
  return providerId === "gemini" || !isLocalProviderBaseUrl(baseUrl);
}

export function canReuseProviderKey(params: {
  hasKey: boolean;
  currentProviderId: ProviderId;
  currentBaseUrl?: string | null;
  nextProviderId: ProviderId;
  nextBaseUrl?: string | null;
}) {
  return params.hasKey
    && params.currentProviderId === params.nextProviderId
    && normalizeProviderBaseUrl(params.currentBaseUrl) === normalizeProviderBaseUrl(params.nextBaseUrl);
}
