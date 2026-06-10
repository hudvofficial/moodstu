"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Plus, ArrowDownToLine, ArrowUpFromLine, Loader2, History, Package, ChevronDown, BarChart3, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRealtimeMulti } from "@/hooks/use-realtime-multi";

import { useInventoryFilters } from "@/hooks/useInventoryFilters";
import {
  useInventory,
  useInventoryStats,
  useTransactionHistory,
  prefetchInventory,
  revalidateInventory,
} from "@/lib/hooks/use-inventory";
import { deleteInventoryTransaction } from "@/app/actions/inventory-mutations";
import { InventoryStatsBar } from "@/components/inventory/inventory-stats-bar";
import { InventoryFilters as InventoryFiltersBar } from "@/components/inventory/inventory-filters";
import { TransactionFilters, computeDateRange } from "@/components/inventory/transaction-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { TransactionHistoryTable } from "@/components/inventory/transaction-history-table";
import { ApprovalRequestsTab } from "@/components/inventory/approval-requests-tab";
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
import { ExpandableFAB } from "@/components/ui/expandable-fab";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

interface InventoryListClientProps {
  initialList?: { data: InventoryItem[]; count: number };
  initialStats?: InventoryStats;
  userRole?: string;
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

function InventoryListInner({ initialList, initialStats, userRole = "viewer" }: InventoryListClientProps) {
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
  const error = tab === "history" ? txError : tab === "items" ? itemsError : null;

  // 📡 Realtime — single multi-table channel for both items + transactions
  const refreshInventoryCaches = useCallback(() => {
    void revalidateInventory();
  }, []);

  // Tín hiệu qua realtime_signals (2 bảng nguồn không có grant SELECT cho
  // authenticated) — vẫn 1 channel duy nhất, lọc theo table_name.
  useRealtimeMulti(
    [
      {
        table: "realtime_signals",
        filter: "table_name=in.(inventory_items,inventory_transactions)",
        eventTypes: ["INSERT"],
      },
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
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState<InventoryTransaction | null>(null);
  const [isPending, startTransition] = useTransition();

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

  // ── Transaction Action Handlers ──
  const handlePrint = useCallback((txn: InventoryTransaction) => {
    let routeId = "";
    if (txn.receipt_id) {
      // Regular receipt from receipts table
      routeId = txn.receipt_id;
    } else if (txn.source_type === 'contract_addon_sale' && txn.source_id) {
      // Payment receipt from contract addon sale
      routeId = `payment:${txn.source_id}`;
    } else if (txn.source_id && txn.source_id !== txn.parent_transaction_id && txn.source_id !== txn.id) {
      // Other payment receipt
      routeId = `payment:${txn.source_id}`;
    }

    if (routeId) {
      window.open(`/finance/receipts/${routeId}/print`, "_blank");
    } else {
      toast.error("Không tìm thấy dữ liệu phiếu thu / thanh toán.");
    }
  }, []);

  const handleEditTxn = useCallback((txn: InventoryTransaction) => {
    // Open drawer to view/edit fulfillments
    setDrawerTxn(txn);
  }, []);

  const handleDeleteTxn = useCallback((txn: InventoryTransaction) => {
    setTxnToDelete(txn);
  }, []);

  const confirmDeleteTxn = useCallback(() => {
    if (!txnToDelete) return;

    startTransition(async () => {
      try {
        await deleteInventoryTransaction(txnToDelete.id);
        toast.success("Đã xóa giao dịch");
        void revalidateInventory();
      } catch (err: any) {
        toast.error(err.message || "Không thể xóa giao dịch");
      }
    });
  }, [txnToDelete]);

  return (
    <>
    <div className="main-container gap-3!">
      {/* ── Stats + Action (unified container — same pattern as contracts) ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <InventoryStatsBar stats={stats} />
        
        <div className="hidden lg:flex gap-2">
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

      <ExpandableFAB
        mainAction={{
          icon: Plus,
          label: "Khai báo",
          onClick: handleCreate,
        }}
        subActions={[
          {
            icon: ArrowDownToLine,
            label: "Nhập kho",
            onClick: handleStockIn,
            variant: "success",
          },
          {
            icon: ArrowUpFromLine,
            label: "Xuất kho",
            onClick: handleStockOut,
            variant: "warning",
          },
        ]}
      />

      {/* ── Tabs & Filters Row ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-bg-card border border-border/50 rounded-lg w-fit shrink-0 shadow-xs">
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
          <TabButton
            active={tab === "approvals"}
            onClick={() => setTab("approvals")}
            icon={<ClipboardCheck className="w-4 h-4" />}
            label="Duyệt yêu cầu"
          />
        </div>

        {/* Right: Filters */}
        <div className="flex-1 overflow-x-auto scrollbar-hide flex lg:justify-end">
          {tab === "approvals" ? null : tab === "history" ? (
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
        </div>
      </div>

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
      {tab === "approvals" ? (
        <ApprovalRequestsTab userRole={userRole} />
      ) : !isLoading && !error && (
        <>
          {tab === "history" ? (
            <TransactionHistoryTable
              transactions={transactions}
              onRowClick={handleTxRowClick}
              onHover={handleHover}
              onPrint={handlePrint}
              onEdit={handleEditTxn}
              onDelete={handleDeleteTxn}
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
      userRole={userRole}
    />
    <ConfirmDialog
      isOpen={!!txnToDelete}
      onClose={() => setTxnToDelete(null)}
      onConfirm={confirmDeleteTxn}
      title="Xóa giao dịch kho?"
      message={`Bạn có chắc muốn xóa giao dịch ${txnToDelete?.item_name || "này"}? Hành động này không thể hoàn tác.`}
      confirmLabel="Xóa"
      variant="danger"
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
