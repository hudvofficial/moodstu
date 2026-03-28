"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * useInventoryFilters — Inventory module filter hook
 * ═══════════════════════════════════════════════════════════
 *
 * Clone: useContractFilters.ts
 * Pattern: nuqs (via useListFilters) → instant URL sync, no lag
 * ═══════════════════════════════════════════════════════════
 */

import { useCallback } from "react";
import { useListFilters } from "./useListFilters";

// ── Default values ────────────────────────────────────────────
const INVENTORY_FILTER_DEFAULTS = {
  status:   "all",    // "all" | "active" | "low_stock" | "out_of_stock" | "discontinued"
  search:   "",
  category: "all",    // "all" | category values from constants
  sort:     "newest", // "newest" | "name_asc" | "stock_asc" | "stock_desc"
  page:     "1",
} as const;

// ── Hook ──────────────────────────────────────────────────────
export function useInventoryFilters() {
  const { params, setParam, setParams, resetParams, hasActiveFilters } =
    useListFilters(INVENTORY_FILTER_DEFAULTS);

  // ── Computed (typed) filters ─────────────────────────────────
  const filters = {
    status:   params.status,
    search:   params.search,
    category: params.category,
    sort:     params.sort,
    page:     Number(params.page) || 1,
  };

  // ── Setters ───────────────────────────────────────────────────
  const setStatus = useCallback(
    (status: string) => setParams({ status, page: "1" }),
    [setParams]
  );

  const setSearch = useCallback(
    (search: string) => setParams({ search, page: "1" }),
    [setParams]
  );

  const setCategory = useCallback(
    (category: string) => setParams({ category, page: "1" }),
    [setParams]
  );

  const setSort = useCallback(
    (sort: string) => setParam("sort", sort),
    [setParam]
  );

  const setPage = useCallback(
    (page: number) => setParam("page", String(page)),
    [setParam]
  );

  return {
    filters,
    setStatus,
    setSearch,
    setCategory,
    setSort,
    setPage,
    resetParams,
    hasActiveFilters,
  };
}
