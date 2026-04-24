"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * use-inventory — SWR hooks for Inventory module
 * ═══════════════════════════════════════════════════════════
 *
 * Clone: lib/hooks/use-contracts.ts
 * Pattern: SWR client + keepPreviousData + array key (filters encoded)
 * ═══════════════════════════════════════════════════════════
 */

import useSWR from "swr";
import { cacheKeys, mutate, prefetch, revalidateByPrefixes } from "@/lib/swr";
import {
  fetchInventoryList,
  fetchInventoryDetail,
  getInventoryStats,
} from "@/app/actions/inventory-queries";
import type { InventoryFilters } from "@/types/inventory";

const prefetchedInventoryDetails = new Set<string>();

// ─── LIST (paginated + filtered) ─────────────────────────────

export function useInventory(filters: InventoryFilters) {
  const { data, error, isLoading, isValidating } = useSWR(
    // ⚠️ Array key = filters encoded → SWR auto-refetch on filter change
    [cacheKeys.inventory(), filters],
    () => fetchInventoryList(filters),
    { keepPreviousData: true }
  );

  return {
    items: data?.data ?? [],
    total: data?.count ?? 0,
    page: filters.page || 1,
    pageSize: 20, // matches INVENTORY_PAGE_SIZE constant
    isLoading,
    isValidating,
    error,
  };
}

// ─── STATS ──────────────────────────────────────────────────

export function useInventoryStats() {
  const { data, error, isLoading } = useSWR(
    cacheKeys.inventoryStats(),
    () => getInventoryStats()
  );

  return {
    stats: data ?? null,
    isLoading,
    error,
  };
}

// ─── DETAIL ─────────────────────────────────────────────────

export function useInventoryDetail(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? cacheKeys.inventoryDetail(id) : null,
    () => (id ? fetchInventoryDetail(id) : null)
  );

  return {
    detail: data ?? null,
    isLoading,
    error,
  };
}

// ─── PREFETCH (hover → preload detail) ──────────────────────

export function prefetchInventory(id: string) {
  if (prefetchedInventoryDetails.has(id)) return;
  prefetchedInventoryDetails.add(id);

  prefetch(cacheKeys.inventoryDetail(id), () => fetchInventoryDetail(id));
}

// ─── MUTATE HELPERS (after create/update/delete) ────────────

export async function revalidateInventory(itemId?: string) {
  await Promise.all([
    revalidateByPrefixes(cacheKeys.inventory()),
    mutate(cacheKeys.inventorySaleOptions()),
    mutate(cacheKeys.inventoryStats()),
    itemId ? mutate(cacheKeys.inventoryDetail(itemId)) : Promise.resolve(),
  ]);
}

export async function revalidateInventoryDetail(id: string) {
  await mutate(cacheKeys.inventoryDetail(id));
}
