import { clear, createStore, entries, set } from "idb-keyval";
import type { Arguments } from "swr";

const STORE_NAME = "swr-cache";
const DB_NAME = "mood-studio-v2";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const PERSIST_WHITELIST = [
  "calendar",
  "categories",
  "crm",
  "customer",
  "dashboard",
  "debt",
  "dress",
  "employees",
  "expenses",
  "finance",
  "goals",
  "inventory",
  "leads",
  "payments",
  "printing",
  "productivity",
  "receipts",
  "reports",
  "services",
  "settings",
  "team",
] as const;

type PersistedEntry = {
  data: unknown;
  key?: Arguments;
  savedAt: number;
};

const store = createStore(DB_NAME, STORE_NAME);
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function normalizeKey(key: unknown) {
  if (typeof key === "string") return key;
  if (Array.isArray(key)) {
    const [namespace, params] = key;
    if (typeof namespace !== "string") return null;
    if (params === undefined) return namespace;
    try {
      return `${namespace}:${JSON.stringify(params)}`;
    } catch {
      return namespace;
    }
  }
  return null;
}

export function shouldPersistSWRKey(key: unknown) {
  const normalized = normalizeKey(key);
  if (!normalized) return false;
  if (
    normalized.includes("auth") ||
    normalized.includes("search") ||
    normalized.includes("temporary")
  ) {
    return false;
  }
  return PERSIST_WHITELIST.some(
    (prefix) =>
      normalized === prefix ||
      normalized.startsWith(`${prefix}:`) ||
      normalized.startsWith(`${prefix}-`),
  );
}

export function serializeSWRKey(key: unknown) {
  return normalizeKey(key);
}

export function saveSWRCacheEntry(key: unknown, data: unknown) {
  const normalized = normalizeKey(key);
  if (!normalized || !shouldPersistSWRKey(normalized) || data === undefined) return;

  const existing = pendingTimers.get(normalized);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingTimers.delete(normalized);
    void set(
      normalized,
      { data, key: key as Arguments, savedAt: Date.now() } satisfies PersistedEntry,
      store,
    ).catch(
      () => undefined,
    );
  }, 250);

  pendingTimers.set(normalized, timer);
}

export async function loadSWRCacheEntries() {
  try {
    const now = Date.now();
    const cached = await entries<string, PersistedEntry>(store);
    const valid = new Map<Arguments, unknown>();

    for (const [key, value] of cached) {
      if (!value || now - value.savedAt > MAX_AGE_MS || !shouldPersistSWRKey(key)) continue;
      valid.set(value.key ?? key, value.data);
    }

    return valid;
  } catch {
    return new Map<string, unknown>();
  }
}

export async function clearSWRPersistCache() {
  pendingTimers.forEach((timer) => clearTimeout(timer));
  pendingTimers.clear();

  try {
    await clear(store);
  } catch {
    // IndexedDB can be unavailable in private browsing; logout should still continue.
  }
}

export async function requestPersistentStorage() {
  try {
    if ("storage" in navigator && "persist" in navigator.storage) {
      await navigator.storage.persist();
    }
  } catch {
    // Best-effort only.
  }
}
