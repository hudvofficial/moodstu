"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 📦 InventoryListClient — Main client component for inventory list page
 *
 * V2 WIRED: Uses useInventory() SWR hook → Server Actions → Real DB data.
 * Clone source: contracts-list-client.tsx
 * Pattern: SWR client + Suspense + useRealtime + nuqs filters
 */

import { Suspense, useMemo, useCallback } from "react";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";

import { useInventoryFilters } from "@/hooks/useInventoryFilters";
import { useInventory, useInventoryStats, prefetchInventory, revalidateInventory } from "@/lib/hooks/use-inventory";
import { InventoryStatsBar } from "@/components/inventory/inventory-stats-bar";
import { InventoryFilters as InventoryFiltersBar } from "@/components/inventory/inventory-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import type {
  InventoryFilters as InventoryFiltersType,
  InventoryItem,
  InventoryStats,
} from "@/types/inventory";
import { InventoryFormModal } from "@/components/inventory/inventory-form-modal";
import { StockInModal } from "@/components/inventory/stock-in-modal";
import { StockOutModal } from "@/components/inventory/stock-out-modal";
import { InventoryDetailDrawer } from "@/components/inventory/inventory-detail-drawer";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { INVENTORY_PAGE_SIZE } from "@/types/inventory-constants";

interface InventoryListClientProps {
  initialList?: { data: InventoryItem[]; count: number };
  initialStats?: InventoryStats;
}

const REALTIME_REFRESH_DELAY_MS = 600;

// ─── INNER COMPONENT ─────────────────────────────────

function InventoryListInner({ initialList, initialStats }: InventoryListClientProps) {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    filters,
    setStatus,
    setCategory,
    setSort,
    setPage,
  } = useInventoryFilters();

  // ── SWR: Real data from Server Actions ──
  const swrFilters = useMemo(() => ({
    status: filters.status === "all" ? undefined : filters.status,
    category: filters.category === "all" ? undefined : filters.category,
    search: filters.search || undefined,
    sort: filters.sort,
    page: filters.page,
  } as InventoryFiltersType), [filters]);

  const { items, total, page, pageSize, isLoading, error } = useInventory(
    swrFilters,
    initialList,
  );
  const { stats } = useInventoryStats(initialStats);

  // 📡 Realtime — auto-refresh on INSERT/UPDATE/DELETE by any user
  const refreshInventoryCaches = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void revalidateInventory();
    }, REALTIME_REFRESH_DELAY_MS);
  }, []);

  useRealtime("inventory_items", { onChange: refreshInventoryCaches });
  useRealtime("inventory_transactions", { onChange: refreshInventoryCaches });

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ── Modal states ──
  const [showCreate, setShowCreate] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [drawerItem, setDrawerItem] = useState<InventoryItem | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ── Handlers ──
  const handleRowClick = useCallback((item: InventoryItem) => {
    setDrawerItem(item);
  }, []);
  const handleHover = useCallback((id: string) => {
    prefetchInventory(id);
    router.prefetch(`/inventory/${id}`);
  }, [router]);
  const handleCreate = useCallback(() => setShowCreate(true), []);
  const handleStockIn = useCallback(() => {
    setSelectedItem(null);
    setShowStockIn(true);
  }, []);
  const handleStockOut = useCallback(() => {
    setSelectedItem(null);
    setShowStockOut(true);
  }, []);
  const handleRowStockIn = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setShowStockIn(true);
  }, []);
  const handleRowStockOut = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setShowStockOut(true);
  }, []);

  return (
    <>
    <div className="main-container gap-3!">
      {/* ── Stats + Actions (unified container) ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <InventoryStatsBar stats={stats} />
        <div className="hidden lg:flex gap-2">
          <Button unstyled onClick={handleCreate} className="btn btn-primary gap-2 shrink-0">
            <Plus className="w-5 h-5" />
            <span>Khai báo</span>
          </Button>
          <Button unstyled onClick={handleStockIn} className="btn btn-primary gap-2 shrink-0">
            <ArrowDownToLine className="w-5 h-5" />
            <span>Nhập kho</span>
          </Button>
          <Button unstyled onClick={handleStockOut} className="btn btn-primary gap-2 shrink-0">
            <ArrowUpFromLine className="w-5 h-5" />
            <span>Xuất kho</span>
          </Button>
        </div>
      </div>

      <FAB onClick={handleCreate} label="Khai báo" />

      {/* ── Filters (mobile + desktop tách bạch) ── */}
      <InventoryFiltersBar
        status={filters.status}
        category={filters.category}
        sort={filters.sort}
        onStatusChange={setStatus}
        onCategoryChange={setCategory}
        onSortChange={setSort}
        stats={stats}
      />

      {/* ── Loading State ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-sm text-text-secondary">
            Đang tải dữ liệu...
          </span>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="error-text">
            Lỗi tải dữ liệu: {error.message}
          </p>
        </div>
      )}

      {/* ── Table / Card List ── */}
      {!isLoading && !error && (
        <>
          <InventoryTable
            items={items}
            onRowClick={handleRowClick}
            onHover={handleHover}
            onStockIn={handleRowStockIn}
            onStockOut={handleRowStockOut}
          />

          {/* ── Pagination ── */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            className="mt-6"
          />

          {/* ── Footer Count ── */}
          <p className="text-center text-xs text-text-muted mt-3">
            Hiển thị {Math.min((page - 1) * INVENTORY_PAGE_SIZE + 1, total)}–
            {Math.min(page * INVENTORY_PAGE_SIZE, total)} của {total} vật tư
          </p>
        </>
      )}
    </div>

    {/* ── Modals (key forces remount → clean state each open) ── */}
    {showCreate && (
      <InventoryFormModal
        key="create-inventory-item"
        isOpen
        onClose={() => setShowCreate(false)}
      />
    )}
    {showStockIn && <StockInModal isOpen onClose={() => { setShowStockIn(false); setSelectedItem(null); }} item={selectedItem} items={items} />}
    {showStockOut && <StockOutModal isOpen onClose={() => { setShowStockOut(false); setSelectedItem(null); }} item={selectedItem} items={items} />}
    <InventoryDetailDrawer
      item={drawerItem}
      isOpen={!!drawerItem}
      onClose={() => setDrawerItem(null)}
    />
    </>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────

export default function InventoryListClient(props: InventoryListClientProps) {
  return (
    <Suspense>
      <InventoryListInner {...props} />
    </Suspense>
  );
}
