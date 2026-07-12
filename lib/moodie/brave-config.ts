import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/settings-secrets";

export const MOODIE_BRAVE_ENABLED_KEY = "moodie_brave_enabled";
export const MOODIE_BRAVE_API_KEY_KEY = "moodie_brave_api_key";
export const MOODIE_BRAVE_ENDPOINT_KEY = "moodie_brave_endpoint";
export const MOODIE_BRAVE_MCP_URL_KEY = "moodie_brave_mcp_url";
export const MOODIE_BRAVE_MCP_TOKEN_KEY = "moodie_brave_mcp_token";
export const MOODIE_BRAVE_TIMEOUT_KEY = "moodie_brave_timeout_ms";
export const MOODIE_BRAVE_MAX_BYTES_KEY = "moodie_brave_max_response_bytes";

export const DEFAULT_BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1";
export const DEFAULT_BRAVE_TIMEOUT_MS = 12_000;
export const DEFAULT_BRAVE_MAX_RESPONSE_BYTES = 1_000_000;

export type MoodieBraveRuntimeConfig = {
  enabled: boolean;
  apiKey?: string;
  endpoint: string;
  mcpUrl?: string;
  mcpToken?: string;
  timeoutMs: number;
  maxResponseBytes: number;
};

export type MoodieBraveSettings = {
  enabled: boolean;
  hasApiKey: boolean;
  endpoint: string;
  hasMcpToken: boolean;
  mcpUrl: string;
  timeoutMs: number;
  maxResponseBytes: number;
  source: "database" | "environment" | "none";
};

function positiveInteger(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function enabledValue(value: string | null | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return value === "true" || value === "1";
}

export async function getMoodieBraveRuntimeConfig(): Promise<MoodieBraveRuntimeConfig> {
  try {
    const supabase = await createAdminClient();
    const keys = [
      MOODIE_BRAVE_ENABLED_KEY,
      MOODIE_BRAVE_API_KEY_KEY,
      MOODIE_BRAVE_ENDPOINT_KEY,
      MOODIE_BRAVE_MCP_URL_KEY,
      MOODIE_BRAVE_MCP_TOKEN_KEY,
      MOODIE_BRAVE_TIMEOUT_KEY,
      MOODIE_BRAVE_MAX_BYTES_KEY,
    ];
    const { data } = await supabase.from("system_settings").select("key, value").in("key", keys);
    const row = (key: string) => (data || []).find((item) => item.key === key)?.value?.trim() || null;
    const storedApiKey = decryptSecret(row(MOODIE_BRAVE_API_KEY_KEY)) || undefined;
    const storedMcpToken = decryptSecret(row(MOODIE_BRAVE_MCP_TOKEN_KEY)) || undefined;
    const envApiKey = process.env.MOODIE_BRAVE_API_KEY?.trim() || undefined;
    const envMcpUrl = process.env.MOODIE_BRAVE_MCP_URL?.trim() || undefined;
    const envMcpToken = process.env.MOODIE_BRAVE_MCP_TOKEN?.trim() || undefined;
    const apiKey = storedApiKey || envApiKey;
    const mcpUrl = row(MOODIE_BRAVE_MCP_URL_KEY) || envMcpUrl;
    return {
      enabled: enabledValue(row(MOODIE_BRAVE_ENABLED_KEY), Boolean(apiKey || mcpUrl)),
      apiKey,
      endpoint: row(MOODIE_BRAVE_ENDPOINT_KEY) || process.env.MOODIE_BRAVE_ENDPOINT?.trim() || DEFAULT_BRAVE_SEARCH_ENDPOINT,
      mcpUrl: mcpUrl || undefined,
      mcpToken: storedMcpToken || envMcpToken,
      timeoutMs: positiveInteger(row(MOODIE_BRAVE_TIMEOUT_KEY) || process.env.MOODIE_BRAVE_MCP_TIMEOUT_MS, DEFAULT_BRAVE_TIMEOUT_MS),
      maxResponseBytes: positiveInteger(row(MOODIE_BRAVE_MAX_BYTES_KEY) || process.env.MOODIE_BRAVE_MCP_MAX_RESPONSE_BYTES, DEFAULT_BRAVE_MAX_RESPONSE_BYTES),
    };
  } catch {
    const apiKey = process.env.MOODIE_BRAVE_API_KEY?.trim() || undefined;
    const mcpUrl = process.env.MOODIE_BRAVE_MCP_URL?.trim() || undefined;
    return {
      enabled: Boolean(apiKey || mcpUrl),
      apiKey,
      endpoint: process.env.MOODIE_BRAVE_ENDPOINT?.trim() || DEFAULT_BRAVE_SEARCH_ENDPOINT,
      mcpUrl,
      mcpToken: process.env.MOODIE_BRAVE_MCP_TOKEN?.trim() || undefined,
      timeoutMs: positiveInteger(process.env.MOODIE_BRAVE_MCP_TIMEOUT_MS, DEFAULT_BRAVE_TIMEOUT_MS),
      maxResponseBytes: positiveInteger(process.env.MOODIE_BRAVE_MCP_MAX_RESPONSE_BYTES, DEFAULT_BRAVE_MAX_RESPONSE_BYTES),
    };
  }
}

export async function getMoodieBraveSettingsSnapshot(): Promise<MoodieBraveSettings> {
  const config = await getMoodieBraveRuntimeConfig();
  const databaseConfigured = Boolean(config.apiKey || config.mcpUrl);
  const envConfigured = Boolean(process.env.MOODIE_BRAVE_API_KEY || process.env.MOODIE_BRAVE_MCP_URL);
  return {
    enabled: config.enabled,
    hasApiKey: Boolean(config.apiKey),
    endpoint: config.endpoint,
    hasMcpToken: Boolean(config.mcpToken),
    mcpUrl: config.mcpUrl || "",
    timeoutMs: config.timeoutMs,
    maxResponseBytes: config.maxResponseBytes,
    source: databaseConfigured ? "database" : envConfigured ? "environment" : "none",
  };
}
