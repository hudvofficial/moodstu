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
import { cacheKeys, mutate, prefetch } from "@/lib/swr";
import { invalidateInventoryAfterWrite } from "@/lib/cache-invalidation";
import {
  fetchInventoryList,
  fetchInventoryDetail,
  fetchTransactionHistory,
  getInventoryStats,
} from "@/app/actions/inventory-queries";
import type {
  InventoryDetail,
  InventoryFilters,
  InventoryItem,
  InventoryStats,
  InventoryTransaction,
  TransactionFilters,
} from "@/types/inventory";
import { INVENTORY_PAGE_SIZE, TRANSACTION_PAGE_SIZE } from "@/types/inventory-constants";

const prefetchedInventoryDetails = new Set<string>();

// ─── LIST (paginated + filtered) ─────────────────────────────

export function useInventory(
  filters: InventoryFilters,
  fallbackData?: { data: InventoryItem[]; count: number },
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const { data, error, isLoading, isValidating } = useSWR(
    // ⚠️ Array key = filters encoded → SWR auto-refetch on filter change
    // Skip fetch khi enabled=false (lazy theo tab)
    enabled ? [cacheKeys.inventory(), filters] : null,
    () => fetchInventoryList(filters),
    {
      keepPreviousData: true,
      fallbackData,
      revalidateOnMount: fallbackData ? false : undefined,
    }
  );

  return {
    items: data?.data ?? [],
    total: data?.count ?? 0,
    page: filters.page || 1,
    pageSize: INVENTORY_PAGE_SIZE,
    isLoading,
    isValidating,
    error,
  };
}

// ─── STATS ──────────────────────────────────────────────────

export function useInventoryStats(
  fallbackData?: InventoryStats,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const { data, error, isLoading } = useSWR(
    enabled ? cacheKeys.inventoryStats() : null,
    () => getInventoryStats(),
    {
      fallbackData,
      revalidateOnMount: fallbackData ? false : undefined,
    }
  );

  return {
    stats: data ?? null,
    isLoading,
    error,
  };
}

// ─── TRANSACTION HISTORY (paginated + filtered) ─────────────

export function useTransactionHistory(
  filters: TransactionFilters,
  fallbackData?: { data: InventoryTransaction[]; count: number },
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const { data, error, isLoading, isValidating } = useSWR(
    enabled ? [cacheKeys.inventoryTransactions(), filters] : null,
    () => fetchTransactionHistory(filters),
    {
      keepPreviousData: true,
      fallbackData,
      revalidateOnMount: fallbackData ? false : undefined,
    }
  );

  return {
    transactions: data?.data ?? [],
    total: data?.count ?? 0,
    page: filters.page || 1,
    pageSize: TRANSACTION_PAGE_SIZE,
    isLoading,
    isValidating,
    error,
  };
}

// ─── DETAIL ─────────────────────────────────────────────────

export function useInventoryDetail(
  id: string | null,
  fallbackData?: InventoryDetail | null,
) {
  const { data, error, isLoading } = useSWR(
    id ? cacheKeys.inventoryDetail(id) : null,
    () => (id ? fetchInventoryDetail(id) : null),
    {
      fallbackData: fallbackData || undefined,
      revalidateOnMount: fallbackData ? false : undefined,
    }
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
  await invalidateInventoryAfterWrite(itemId);
}

export async function revalidateInventoryDetail(id: string) {
  await mutate(cacheKeys.inventoryDetail(id));
}
