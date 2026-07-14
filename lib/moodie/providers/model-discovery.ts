import { fetchMoodieGeminiModelOptions } from "@/lib/moodie/gemini-models";
import { normalizeProviderBaseUrl } from "@/lib/moodie/providers/config-policy";
import type { ProviderId, ProviderModelOption } from "@/lib/moodie/providers/types";

type OpenAIModelsPayload = {
  data?: Array<{ id?: string; name?: string }>;
  models?: Array<{ id?: string; name?: string }>;
  error?: string | { message?: string };
  detail?: string;
};

export type ProviderModelDiscoveryResult = {
  models: ProviderModelOption[];
  latencyMs: number;
};

export class ProviderModelDiscoveryError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderModelDiscoveryError";
  }
}

function modelError(payload: OpenAIModelsPayload, status: number) {
  if (typeof payload.error === "string") return payload.error;
  return payload.error?.message || payload.detail || `Provider models API error (${status})`;
}

function normalizeDiscoveredModels(payload: OpenAIModelsPayload): ProviderModelOption[] {
  const source = payload.data || payload.models || [];
  const unique = new Map<string, ProviderModelOption>();

  for (const item of source) {
    const value = (item.id || item.name || "").trim();
    if (!value || unique.has(value)) continue;
    unique.set(value, { value, label: value });
  }

  return [...unique.values()]
    .sort((left, right) => left.label.localeCompare(right.label, "en", { numeric: true }))
    .slice(0, 500);
}

export async function discoverOpenAICompatibleModels(params: {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<ProviderModelDiscoveryResult> {
  const baseUrl = normalizeProviderBaseUrl(params.baseUrl);
  if (!baseUrl) throw new Error("Thiếu Base URL để kiểm tra provider");

  const url = new URL(`${baseUrl}/models`);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Base URL chỉ hỗ trợ giao thức http hoặc https");
  }

  const headers: HeadersInit = { Accept: "application/json" };
  if (params.apiKey?.trim()) headers.Authorization = `Bearer ${params.apiKey.trim()}`;

  const startedAt = Date.now();
  const response = await (params.fetchImpl || fetch)(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as OpenAIModelsPayload;

  if (!response.ok) throw new ProviderModelDiscoveryError(modelError(payload, response.status), response.status);

  const models = normalizeDiscoveredModels(payload);
  if (models.length === 0) {
    throw new ProviderModelDiscoveryError("Provider kết nối được nhưng không trả về model nào từ endpoint /models");
  }

  return { models, latencyMs: Date.now() - startedAt };
}

export async function discoverProviderModels(params: {
  providerId: ProviderId;
  baseUrl?: string;
  apiKey: string;
}): Promise<ProviderModelDiscoveryResult> {
  const startedAt = Date.now();

  if (params.providerId === "gemini") {
    const models = await fetchMoodieGeminiModelOptions(params.apiKey);
    if (models.length === 0) throw new Error("Gemini không trả về model chat khả dụng");
    return { models, latencyMs: Date.now() - startedAt };
  }

  return discoverOpenAICompatibleModels({
    baseUrl: params.baseUrl || "",
    apiKey: params.apiKey,
  });
}
