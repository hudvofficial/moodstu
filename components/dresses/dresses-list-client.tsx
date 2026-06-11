"use client";

import { useState, useCallback, useMemo, Suspense, useEffect, useRef } from "react";
import { usePullToRefreshCallback } from "@/contexts/pull-to-refresh-context";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Shirt, Plus, FilterX, ScanLine, CalendarDays } from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { useRealtimeSignal } from "@/hooks/use-realtime-signal";
import { fetchDressList, getDressStats } from "@/app/actions/dress-queries";
import { DRESS_PAGE_SIZE } from "@/types/dress-constants";
import type { DressItem, DressFilters, DressStats } from "@/types/dress";
import { cacheKeys, revalidateByPrefixes } from "@/lib/swr";
import { toast } from "@/lib/toast-utils";
import { Pagination } from "@/components/ui/pagination";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { DressesStatsBar } from "./dresses-stats-bar";
import DressesFilters from "./dresses-filters";
import DressCard from "@/components/dresses/dress-card";
import DressFormModal from "@/components/dresses/dress-form-modal";
import { DressDrawer } from "@/components/dresses/dress-drawer";
import { DressScannerModal } from "@/components/dresses/dress-scanner-modal";

interface DressesListClientProps {
  initialList?: { data: DressItem[]; count: number };
  initialStats?: DressStats;
  canManageCatalog?: boolean;
}

const REALTIME_REFRESH_DELAY_MS = 600;

// ═══════════════════════════════════════════
// DressesListClient — Main page component
// Gold Standard: URL searchParams for filter state
// (share link, back button, bookmark)
// ═══════════════════════════════════════════

function DressesListInner({
  initialList,
  initialStats,
  canManageCatalog = false,
}: DressesListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Read filters from URL ──
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("q") || undefined;

  const filters: DressFilters = {
    status: status as DressFilters["status"],
    category: category as DressFilters["category"],
    search,
    sort: sort as DressFilters["sort"],
    page,
  };

  // ── Form state (local only — not URL) ──
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DressItem | null>(null);
  const [drawerItem, setDrawerItem] = useState<DressItem | null>(null);
  const [scanOpen, setScanOpen] = useState(false);


  // SWR — dress list
  const { data: listData, error, mutate: mutateList } = useSWR(
    [cacheKeys.dresses(), filters],
    () => fetchDressList(filters),
    { keepPreviousData: true, fallbackData: initialList }
  );

  // SWR — stats
  const { data: stats, mutate: mutateStats } = useSWR<DressStats>(
    cacheKeys.dressStats(),
    () => getDressStats(),
    { keepPreviousData: true, fallbackData: initialStats }
  );

  // 📡 Realtime — auto-refresh on INSERT/UPDATE/DELETE by any user
  const refreshDressCaches = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void revalidateByPrefixes([cacheKeys.dresses(), cacheKeys.dressRentals()]);
      void mutateStats();
    }, REALTIME_REFRESH_DELAY_MS);
  }, [mutateStats]);

  // dresses + dress_rentals: authenticated không có grant SELECT → nhận tín hiệu
  // qua realtime_signals (Signal ≠ Data); dress_reservations đã trong publication.
  useRealtimeSignal("dresses", { onChange: refreshDressCaches });
  useRealtime("dress_reservations", { onChange: refreshDressCaches });
  useRealtimeSignal("dress_rentals", { onChange: refreshDressCaches });

  // Pull-to-refresh
  usePullToRefreshCallback(async () => {
    await revalidateByPrefixes([cacheKeys.dresses(), cacheKeys.dressRentals()]);
    await mutateStats();
  }, [mutateStats]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const dresses = useMemo(() => listData?.data || [], [listData?.data]);
  const totalCount = listData?.count || 0;
  const totalPages = Math.ceil(totalCount / DRESS_PAGE_SIZE);
  const hasFilters = !!(searchParams.get("status") || searchParams.get("category"));

  // ── Pagination via URL ──
  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handleSaved = useCallback(() => {
    mutateList();    // bound mutate — exact SWR key match
    mutateStats();   // refresh stats counters
  }, [mutateList, mutateStats]);

  const openForm = useCallback((item?: DressItem) => {
    setEditItem(item || null);
    setFormOpen(true);
  }, []);

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  // ── Scanner callback ──
  const handleScanned = useCallback(async (code: string) => {
    const found = dresses.find(d => d.item_code === code);
    if (found) {
      setDrawerItem(found);
      toast(`Tìm thấy: ${found.name}`, "success");
      return;
    }
    
    // Fallback: search in DB without redirecting URL (Background Fetch)
    toast("Đang tìm trên máy chủ...", "info");
    try {
      const res = await fetchDressList({ search: code });
      const backendFound = res.data.find(d => d.item_code === code);
      
      if (backendFound) {
        setDrawerItem(backendFound);
        toast(`Tìm thấy: ${backendFound.name}`, "success");
      } else {
        toast(`Không tìm thấy trang phục mã ${code}`, "error");
      }
    } catch (err) {
      toast("Lỗi khi tìm kiếm trên máy chủ", "error");
    }
  }, [dresses]);

  return (
    <div className="main-container gap-3!">

      {/* 1 ─── Stats container + Desktop buttons ─── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <DressesStatsBar stats={stats || { total: 0, available: 0, reserved: 0, rented: 0, maintenance: 0 }} />
        <div className="hidden lg:flex items-center gap-2">
          <Button unstyled onClick={() => setScanOpen(true)} className="btn btn-outline gap-2">
            <ScanLine className="w-4 h-4" />
            <span>Quét mã</span>
          </Button>

          <Link href="/dresses/rentals" className="btn btn-outline gap-2">
            <CalendarDays className="w-4 h-4" />
            <span>Xem lịch</span>
          </Link>
          {canManageCatalog && (
            <Button unstyled onClick={() => openForm()} className="btn btn-primary gap-2 shrink-0">
              <Plus className="w-5 h-5" />
              <span>Thêm trang phục</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2 ─── FAB — mobile ─── */}
      {canManageCatalog && <FAB onClick={() => openForm()} label="Thêm trang phục" />}

      {/* 3 ─── Filters (URL searchParams — Gold Standard) ─── */}
      <DressesFilters stats={stats || { total: 0, available: 0, reserved: 0, rented: 0, maintenance: 0 }} />

      {/* 5 ─── Error state ─── */}
      {error && dresses.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="error-text">Lỗi tải dữ liệu</p>
        </div>
      )}

      {/* 6 ─── Card Grid / Empty States ─── */}
      {!error && dresses.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={FilterX}
            title="Không tìm thấy"
            description="Không tìm thấy trang phục phù hợp bộ lọc"
            actionLabel="Xóa bộ lọc"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            icon={Shirt}
            title="Chưa có trang phục"
            description={canManageCatalog ? "Thêm trang phục đầu tiên vào kho" : "Chưa có trang phục khả dụng"}
            actionLabel={canManageCatalog ? "Thêm trang phục" : undefined}
            onAction={canManageCatalog ? () => openForm() : undefined}
          />
        )
      ) : !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {dresses.map((dress) => (
            <DressCard
              key={dress.id}
              dress={dress}
              onEdit={canManageCatalog ? () => openForm(dress) : undefined}
              onClick={() => setDrawerItem(dress)}
            />
          ))}
        </div>
      )}

      {/* Pagination + Footer count */}
      {totalPages > 1 && (
        <>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={handlePageChange}
            className="mt-2"
          />
          <p className="text-center text-xs text-text-muted mt-1">
            Hiển thị {(page - 1) * DRESS_PAGE_SIZE + 1}–
            {Math.min(page * DRESS_PAGE_SIZE, totalCount)} của {totalCount} trang phục
          </p>
        </>
      )}

      {/* 7 ─── Form Modal ─── */}
      <DressFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        editItem={editItem}
        onSaved={handleSaved}
      />

      {/* 8 ─── Detail Drawer (0ms — data from list) ─── */}
      <DressDrawer
        dress={drawerItem}
        isOpen={!!drawerItem}
        onClose={() => setDrawerItem(null)}
        onEdit={canManageCatalog ? (dress) => openForm(dress) : undefined}
      />

      {/* 9 ─── Camera Scanner Modal ─── */}
      <DressScannerModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={handleScanned}
      />


    </div>
  );
}

// Suspense wrapper (Gold Standard pattern)
export default function DressesListClient(props: DressesListClientProps) {
  return (
    <Suspense>
      <DressesListInner {...props} />
    </Suspense>
  );
}
