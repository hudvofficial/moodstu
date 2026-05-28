"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * useInventoryFilters — Inventory module filter hook
 * ═══════════════════════════════════════════════════════════
 *
 * Clone: useContractFilters.ts
 * Pattern: nuqs (via useListFilters) → instant URL sync, no lag
 *
 * V2: Added tab support (history | items) + transaction filters
 * ═══════════════════════════════════════════════════════════
 */

import { useCallback, useMemo } from "react";
import { useListFilters } from "./useListFilters";
import type { TransactionFilters } from "@/types/inventory";

// ── Default values ────────────────────────────────────────────
const INVENTORY_FILTER_DEFAULTS = {
  // Tab state
  tab:      "history", // "history" | "items" | "approvals"
  // Inventory item filters
  status:   "all",     // "all" | "active" | "low_stock" | "out_of_stock" | "discontinued"
  q:        "",
  search:   "",
  category: "all",     // "all" | category values from constants
  sort:     "newest",  // "newest" | "name_asc" | "stock_asc" | "stock_desc"
  page:     "1",
  // Transaction filters
  txType:     "all",   // "all" | "stock_in" | "stock_out"
  sourceType: "all",   // "all" | source_type values
  dateFrom:   "",      // ISO date string
  dateTo:     "",      // ISO date string
  txPage:     "1",
} as const;

export type InventoryTab = "history" | "items" | "approvals";

// ── Hook ──────────────────────────────────────────────────────
export function useInventoryFilters() {
  const { params, setParam, setParams, resetParams, hasActiveFilters } =
    useListFilters(INVENTORY_FILTER_DEFAULTS);

  // ── Tab ───────────────────────────────────────────────────────
  const tab = (["items", "history", "approvals"].includes(params.tab) ? params.tab : "history") as InventoryTab;

  const setTab = useCallback(
    (newTab: InventoryTab) => setParams({ tab: newTab, page: "1", txPage: "1" }),
    [setParams]
  );

  // ── Inventory item filters (typed) ────────────────────────────
  const filters = {
    status:   params.status,
    search:   params.q || params.search,
    category: params.category,
    sort:     params.sort,
    page:     Number(params.page) || 1,
  };

  // ── Transaction filters (typed) ───────────────────────────────
  const txFilters = useMemo<TransactionFilters>(() => ({
    type: params.txType === "all" ? undefined : params.txType as "stock_in" | "stock_out",
    start_date: params.dateFrom || undefined,
    end_date: params.dateTo || undefined,
    page: Number(params.txPage) || 1,
  }), [params.txType, params.dateFrom, params.dateTo, params.txPage]);

  // ── Setters (inventory items) ─────────────────────────────────
  const setStatus = useCallback(
    (status: string) => setParams({ status, page: "1" }),
    [setParams]
  );

  const setSearch = useCallback(
    (search: string) => setParams({ q: search, search: "", page: "1" }),
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

  // ── Setters (transactions) ────────────────────────────────────
  const setTxType = useCallback(
    (type: string) => setParams({ txType: type, txPage: "1" }),
    [setParams]
  );

  const setDateRange = useCallback(
    (from: string, to: string) => setParams({ dateFrom: from, dateTo: to, txPage: "1" }),
    [setParams]
  );

  const setTxPage = useCallback(
    (page: number) => setParam("txPage", String(page)),
    [setParam]
  );

  return {
    // Tab
    tab,
    setTab,
    // Inventory filters
    filters,
    setStatus,
    setSearch,
    setCategory,
    setSort,
    setPage,
    // Transaction filters
    txFilters,
    setTxType,
    setDateRange,
    setTxPage,
    // Shared
    resetParams,
    hasActiveFilters,
  };
}
