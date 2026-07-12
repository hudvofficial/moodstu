import "server-only";
import { callMoodieMcpTool } from "@/lib/moodie/mcp/client";
import { isAllowedResearchUrl, normalizeBraveSearchQuery, sanitizeResearchText } from "@/lib/moodie/mcp/policy";
import { getMoodieBraveRuntimeConfig } from "@/lib/moodie/brave-config";
import { getMoodieMcpServer } from "@/lib/moodie/mcp/registry";
import type { MoodieResearchResult, MoodieResearchSource } from "@/lib/moodie/mcp/types";
import { finishMoodieBraveUsage, reserveMoodieBraveUsage } from "@/lib/moodie/brave-usage";

export type BraveResearchMode = "web" | "news" | "local";

const TOOL_BY_MODE: Record<BraveResearchMode, string> = {
  web: "brave_web_search",
  news: "brave_news_search",
  local: "brave_local_search",
};

function parseMcpResult(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["results", "web", "news", "locations"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
    if (record[key] && typeof record[key] === "object") {
      const nested = parseMcpResult(record[key]);
      if (nested.length > 0) return nested;
    }
  }
  if (Array.isArray(record.content)) {
    return record.content.flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const text = (part as Record<string, unknown>).text;
      if (typeof text !== "string") return [];
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : parseMcpResult(parsed);
      } catch {
        return [];
      }
    });
  }
  return [];
}

export function normalizeBraveResearchSources(raw: unknown, retrievedAt = new Date().toISOString()) {
  const seen = new Set<string>();
  return parseMcpResult(raw).flatMap((item, index): MoodieResearchSource[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url : typeof row.link === "string" ? row.link : "";
    if (!isAllowedResearchUrl(url)) return [];
    const normalizedUrl = new URL(url).toString();
    if (seen.has(normalizedUrl)) return [];
    seen.add(normalizedUrl);
    const title = sanitizeResearchText(row.title || row.name || normalizedUrl, 300);
    const snippet = sanitizeResearchText(row.description || row.snippet || row.text || "", 1200);
    return [{
      id: `brave:${index}:${Buffer.from(normalizedUrl).toString("base64url").slice(0, 24)}`,
      title: title || new URL(normalizedUrl).hostname,
      url: normalizedUrl,
      snippet,
      publishedAt: typeof row.published === "string" ? row.published : typeof row.age === "string" ? row.age : undefined,
      provider: "brave",
      retrievedAt,
    }];
  }).slice(0, 10);
}

export async function researchWithBrave(input: {
  query: string;
  mode?: BraveResearchMode;
  count?: number;
  signal?: AbortSignal;
  userId?: string;
}): Promise<MoodieResearchResult> {
  const config = await getMoodieBraveRuntimeConfig();
  if (!config.enabled) throw new Error("Brave Search đang tắt trong cài đặt Moodie");
  const query = normalizeBraveSearchQuery(input.query);
  if (!query || query === "[REDACTED]") throw new Error("Research query không còn nội dung an toàn sau khi redaction");
  const mode = input.mode || "web";
  const count = Math.max(1, Math.min(input.count || 8, 10));
  let raw: unknown;
  const startedAt = Date.now();
  const reservation = await reserveMoodieBraveUsage({ userId: input.userId, query, mode });

  try {
  if (config.apiKey) {
    const path = mode === "news" ? "news/search" : mode === "local" ? "local/search" : "web/search";
    const url = new URL(`${config.endpoint.replace(/\/$/, "")}/${path}`);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));
    url.searchParams.set("safesearch", "moderate");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("Brave Search request timed out")), config.timeoutMs);
    const abort = () => controller.abort(input.signal?.reason);
    input.signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": config.apiKey,
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        const detail = sanitizeResearchText(await response.text(), 240);
        throw new Error(`Brave Search HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
      }
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > config.maxResponseBytes) throw new Error("Brave Search response exceeds size limit");
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > config.maxResponseBytes) throw new Error("Brave Search response exceeds size limit");
      raw = JSON.parse(text);
    } finally {
      clearTimeout(timeout);
      input.signal?.removeEventListener("abort", abort);
    }
  } else {
    const server = await getMoodieMcpServer("brave");
    if (!server) throw new Error("Brave Search chưa có API key hoặc MCP endpoint");
    raw = await callMoodieMcpTool({
      server,
      name: TOOL_BY_MODE[mode],
      arguments: { query, count },
      signal: input.signal,
    });
  }

  const sources = normalizeBraveResearchSources(raw);
  await finishMoodieBraveUsage({ userId: input.userId, auditId: reservation.auditId, status: "completed", resultCount: sources.length, durationMs: Date.now() - startedAt });
  return {
    query,
    sources,
    warnings: sources.length > 0 ? [] : ["Brave không trả về nguồn hợp lệ; Moodie không được suy đoán kết quả."],
  };
  } catch (error) {
    await finishMoodieBraveUsage({
      userId: input.userId,
      auditId: reservation.auditId,
      status: "failed",
      resultCount: 0,
      durationMs: Date.now() - startedAt,
      errorCode: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
