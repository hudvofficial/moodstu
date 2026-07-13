import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/settings-secrets";

export const MOODIE_BROWSER_ENABLED_KEY = "moodie_browser_enabled";
export const MOODIE_CLOAK_CDP_URL_KEY = "moodie_cloak_cdp_url";
export const MOODIE_CLOAK_CDP_TOKEN_KEY = "moodie_cloak_cdp_token";
export const MOODIE_BROWSER_TIMEOUT_KEY = "moodie_browser_timeout_ms";
export const DEFAULT_MOODIE_BROWSER_TIMEOUT_MS = 15_000;

export type MoodieBrowserRuntimeConfig = {
  enabled: boolean;
  cdpUrl?: string;
  cdpToken?: string;
  timeoutMs: number;
};

export type MoodieBrowserSettings = {
  enabled: boolean;
  cdpUrl: string;
  hasCdpToken: boolean;
  timeoutMs: number;
  source: "database" | "environment" | "none";
  preferredEngine: "cloakbrowser" | "fetch";
};

function positiveInteger(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 3_000 && parsed <= 30_000 ? parsed : fallback;
}

function enabledValue(value: string | null | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return value === "true" || value === "1";
}

export async function getMoodieBrowserRuntimeConfig(): Promise<MoodieBrowserRuntimeConfig> {
  const envUrl = process.env.MOODIE_CLOAK_CDP_URL?.trim() || undefined;
  const envToken = process.env.MOODIE_CLOAK_CDP_TOKEN?.trim() || undefined;
  try {
    const supabase = await createAdminClient();
    const keys = [MOODIE_BROWSER_ENABLED_KEY, MOODIE_CLOAK_CDP_URL_KEY, MOODIE_CLOAK_CDP_TOKEN_KEY, MOODIE_BROWSER_TIMEOUT_KEY];
    const { data } = await supabase.from("system_settings").select("key, value").in("key", keys);
    const row = (key: string) => (data || []).find((item) => item.key === key)?.value?.trim() || null;
    const cdpUrl = row(MOODIE_CLOAK_CDP_URL_KEY) || envUrl;
    const cdpToken = decryptSecret(row(MOODIE_CLOAK_CDP_TOKEN_KEY)) || envToken;
    return {
      enabled: enabledValue(row(MOODIE_BROWSER_ENABLED_KEY), true),
      cdpUrl: cdpUrl || undefined,
      cdpToken: cdpToken || undefined,
      timeoutMs: positiveInteger(row(MOODIE_BROWSER_TIMEOUT_KEY) || process.env.MOODIE_BROWSER_TIMEOUT_MS, DEFAULT_MOODIE_BROWSER_TIMEOUT_MS),
    };
  } catch {
    return {
      enabled: process.env.MOODIE_BROWSER_ENABLED !== "false",
      cdpUrl: envUrl,
      cdpToken: envToken,
      timeoutMs: positiveInteger(process.env.MOODIE_BROWSER_TIMEOUT_MS, DEFAULT_MOODIE_BROWSER_TIMEOUT_MS),
    };
  }
}

export async function getMoodieBrowserSettingsSnapshot(): Promise<MoodieBrowserSettings> {
  const config = await getMoodieBrowserRuntimeConfig();
  const envConfigured = Boolean(process.env.MOODIE_CLOAK_CDP_URL);
  return {
    enabled: config.enabled,
    cdpUrl: config.cdpUrl || "",
    hasCdpToken: Boolean(config.cdpToken),
    timeoutMs: config.timeoutMs,
    source: config.cdpUrl ? (envConfigured && config.cdpUrl === process.env.MOODIE_CLOAK_CDP_URL?.trim() ? "environment" : "database") : "none",
    preferredEngine: config.cdpUrl ? "cloakbrowser" : "fetch",
  };
}
