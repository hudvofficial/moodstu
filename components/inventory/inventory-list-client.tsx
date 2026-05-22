"use client";

import { useState } from "react";

/**
 * 📦 InventoryListClient — Main client component for inventory list page
 *
 * V2 WIRED: Uses useInventory() SWR hook → Server Actions → Real DB data.
 * Clone source: contracts-list-client.tsx
 * Pattern: SWR client + Suspense + useRealtime + nuqs filters
 *
 * V3: Added tabs - "Lịch sử xuất nhập" (default) + "Danh sách vật tư"
 */

import { Suspense, useMemo, useCallback } from "react";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Loader2, History, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRealtimeMulti } from "@/hooks/use-realtime-multi";

import { useInventoryFilters, type InventoryTab } from "@/hooks/useInventoryFilters";
import {
  useInventory,
  useInventoryStats,
  useTransactionHistory,
  prefetchInventory,
  revalidateInventory,
} from "@/lib/hooks/use-inventory";
import { InventoryStatsBar } from "@/components/inventory/inventory-stats-bar";
import { InventoryFilters as InventoryFiltersBar } from "@/components/inventory/inventory-filters";
import { TransactionFilters, computeDateRange } from "@/components/inventory/transaction-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { TransactionHistoryTable } from "@/components/inventory/transaction-history-table";
import type {
  InventoryFilters as InventoryFiltersType,
  InventoryItem,
  InventoryStats,
  InventoryTransaction,
} from "@/types/inventory";
import { InventoryFormModal } from "@/components/inventory/inventory-form-modal";
import { StockInModal } from "@/components/inventory/stock-in-modal";
import { StockOutModal } from "@/components/inventory/stock-out-modal";
import { InventoryDetailDrawer } from "@/components/inventory/inventory-detail-drawer";
import { OrderDetailsDrawer } from "@/components/inventory/order-details-drawer";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { INVENTORY_PAGE_SIZE, TRANSACTION_PAGE_SIZE } from "@/types/inventory-constants";

interface InventoryListClientProps {
  initialList?: { data: InventoryItem[]; count: number };
  initialStats?: InventoryStats;
}

const REALTIME_REFRESH_DELAY_MS = 600;

// ─── TAB BUTTON ──────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <Button
      unstyled
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
        ${active
          ? "bg-bg-card text-text-main shadow-sm"
          : "text-text-secondary hover:text-text-main hover:bg-bg-card/50"
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

// ─── INNER COMPONENT ─────────────────────────────────

function InventoryListInner({ initialList, initialStats }: InventoryListClientProps) {
  const router = useRouter();

  const {
    // Tab
    tab,
    setTab,
    // Inventory filters
    filters,
    setStatus,
    setCategory,
    setSort,
    setPage,
    // Transaction filters
    txFilters,
    setTxType,
    setDateRange,
    setTxPage,
  } = useInventoryFilters();

  // ── Date range state for UI ──
  const [dateRangeKey, setDateRangeKey] = useState("all");

  const handleDateRangeChange = useCallback((key: string) => {
    setDateRangeKey(key);
    const { from, to } = computeDateRange(key);
    setDateRange(from, to);
  }, [setDateRange]);

  // ── SWR: Inventory items ──
  const swrFilters = useMemo(() => ({
    status: filters.status === "all" ? undefined : filters.status,
    category: filters.category === "all" ? undefined : filters.category,
    search: filters.search || undefined,
    sort: filters.sort,
    page: filters.page,
  } as InventoryFiltersType), [filters]);

  const {
    items,
    total: itemTotal,
    page: itemPage,
    pageSize: itemPageSize,
    isLoading: itemsLoading,
    error: itemsError,
  } = useInventory(swrFilters, initialList);

  // ── SWR: Transaction history ──
  const {
    transactions,
    total: txTotal,
    page: txPage,
    pageSize: txPageSize,
    isLoading: txLoading,
    error: txError,
  } = useTransactionHistory(txFilters);

  const { stats } = useInventoryStats(initialStats);

  // Computed values based on active tab
  const isLoading = tab === "history" ? txLoading : itemsLoading;
  const error = tab === "history" ? txError : itemsError;

  // 📡 Realtime — single multi-table channel for both items + transactions
  const refreshInventoryCaches = useCallback(() => {
    void revalidateInventory();
  }, []);

  useRealtimeMulti(
    [
      { table: "inventory_items" },
      { table: "inventory_transactions" },
    ],
    {
      channelName: "inventory-realtime",
      debounceMs: REALTIME_REFRESH_DELAY_MS,
      onChange: refreshInventoryCaches,
    },
  );

  // ── Modal states ──
  const [showCreate, setShowCreate] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [drawerItem, setDrawerItem] = useState<InventoryItem | null>(null);
  const [drawerTxn, setDrawerTxn] = useState<InventoryTransaction | null>(null);

  // Pagination based on active tab
  const totalPages = tab === "history"
    ? Math.max(1, Math.ceil(txTotal / txPageSize))
    : Math.max(1, Math.ceil(itemTotal / itemPageSize));
  const currentPage = tab === "history" ? txPage : itemPage;
  const handlePageChange = tab === "history" ? setTxPage : setPage;
  const total = tab === "history" ? txTotal : itemTotal;
  const pageSize = tab === "history" ? txPageSize : itemPageSize;

  // ── Handlers ──
  const handleRowClick = useCallback((item: InventoryItem) => {
    setDrawerItem(item);
  }, []);
  const handleTxRowClick = useCallback((txn: InventoryTransaction) => {
    setDrawerTxn(txn);
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
      {/* ── Header: Tabs + Stats + Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 py-3 px-4 lg:px-5 bg-bg-card rounded-xl shadow-xs">
        {/* Left: Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-bg-muted rounded-lg w-fit shrink-0">
          <TabButton
            active={tab === "history"}
            onClick={() => setTab("history")}
            icon={<History className="w-4 h-4" />}
            label="Lịch sử"
          />
          <TabButton
            active={tab === "items"}
            onClick={() => setTab("items")}
            icon={<Package className="w-4 h-4" />}
            label="Vật tư"
          />
        </div>

        {/* Center: Stats (hidden on mobile) */}
        <div className="hidden lg:block flex-1">
          <InventoryStatsBar stats={stats} />
        </div>

        {/* Right: Actions */}
        <div className="hidden lg:flex gap-2 shrink-0">
          <Button unstyled onClick={handleCreate} className="btn btn-primary gap-2 shrink-0">
            <Plus className="w-5 h-5" />
            <span>Khai báo</span>
          </Button>
          <Button unstyled onClick={handleStockIn} className="btn btn-primary gap-2 shrink-0">
            <ArrowDownToLine className="w-5 h-5" />
            <span>Nhập</span>
          </Button>
          <Button unstyled onClick={handleStockOut} className="btn btn-primary gap-2 shrink-0">
            <ArrowUpFromLine className="w-5 h-5" />
            <span>Xuất</span>
          </Button>
        </div>
      </div>

      <FAB onClick={handleCreate} label="Khai báo" />

      {/* ── Filters (conditional based on tab) ── */}
      {tab === "history" ? (
        <TransactionFilters
          type={txFilters.type || "all"}
          dateRange={dateRangeKey}
          onTypeChange={setTxType}
          onDateRangeChange={handleDateRangeChange}
        />
      ) : (
        <InventoryFiltersBar
          status={filters.status}
          category={filters.category}
          sort={filters.sort}
          onStatusChange={setStatus}
          onCategoryChange={setCategory}
          onSortChange={setSort}
          stats={stats}
        />
      )}

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

      {/* ── Content (conditional based on tab) ── */}
      {!isLoading && !error && (
        <>
          {tab === "history" ? (
            <TransactionHistoryTable
              transactions={transactions}
              onRowClick={handleTxRowClick}
              onHover={handleHover}
            />
          ) : (
            <InventoryTable
              items={items}
              onRowClick={handleRowClick}
              onHover={handleHover}
              onStockIn={handleRowStockIn}
              onStockOut={handleRowStockOut}
            />
          )}

          {/* ── Pagination ── */}
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={handlePageChange}
            className="mt-6"
          />

          {/* ── Footer Count ── */}
          <p className="text-center text-xs text-text-muted mt-3">
            Hiển thị {Math.min((currentPage - 1) * pageSize + 1, total)}–
            {Math.min(currentPage * pageSize, total)} của {total} {tab === "history" ? "giao dịch" : "vật tư"}
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
    <OrderDetailsDrawer
      txn={drawerTxn}
      isOpen={!!drawerTxn}
      onClose={() => setDrawerTxn(null)}
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
