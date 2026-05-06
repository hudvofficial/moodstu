"use client";

import { getAvailableCatalogItems } from "@/app/actions/category-actions";
import type { ItemType } from "@/types/contract";

export type CatalogItemType = Exclude<ItemType, "phat_sinh">;

export interface CatalogResult {
  id: string;
  source: "service" | "dress";
  item_name: string;
  service_name: string;
  code?: string | null;
  selling_price: number;
  service_type: string;
  item_type: CatalogItemType;
  unit?: string | null;
  meta?: string | null;
}

type CacheEntry = {
  data: CatalogResult[];
  expiresAt: number;
};

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CatalogResult[]>>();

function normalizeQuery(query?: string) {
  return query?.trim().slice(0, 100) || "";
}

function cacheKey(itemType: CatalogItemType, query?: string) {
  return `${itemType}:${normalizeQuery(query).toLowerCase()}`;
}

export function getCachedCatalogItems(itemType: CatalogItemType, query?: string) {
  const entry = cache.get(cacheKey(itemType, query));
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.data;
}

export async function fetchCatalogItems(itemType: CatalogItemType, query?: string) {
  const key = cacheKey(itemType, query);
  const cached = getCachedCatalogItems(itemType, query);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = getAvailableCatalogItems(itemType, normalizeQuery(query))
    .then((result) => {
      if (!result.success) throw new Error(result.error);
      const data = result.data as CatalogResult[];
      cache.set(key, { data, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

export function prefetchCatalogItems(itemType: CatalogItemType = "dich_vu", query?: string) {
  void fetchCatalogItems(itemType, query).catch(() => {
    // Prefetch is opportunistic; the modal will surface real errors.
  });
}

export function clearCatalogItemsCache(itemType?: CatalogItemType) {
  if (!itemType) {
    cache.clear();
    inFlight.clear();
    return;
  }

  const prefix = `${itemType}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  for (const key of inFlight.keys()) {
    if (key.startsWith(prefix)) inFlight.delete(key);
  }
}
