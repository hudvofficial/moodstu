"use client";

/**
 * 📋 StandaloneRentalsClient — Quản lý đơn thuê vãng lai
 * Route: /dresses/rentals
 *
 * Pattern: Clone rental-history-client.tsx (searchParams + SWR + TabsFilter + Pagination)
 * Data: fetchAllRentals (dress_rentals table — standalone, NOT contract reservations)
 * Status: RENTAL_STATUS_MAP (SSOT from dress-constants.ts)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import {
  ShoppingBag, Loader2, FilterX,
  Calendar, Phone, CheckCircle, XCircle, Play, List,
} from "lucide-react";
import { fetchAllRentals } from "@/app/actions/rental-queries";
import { startRental, cancelRental } from "@/app/actions/rental-mutations";
import { RENTAL_STATUS_MAP } from "@/types/dress-constants";
import type { DressRental } from "@/types/dress";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { cacheKeys, revalidate, revalidateByPrefixes } from "@/lib/swr";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Pagination } from "@/components/ui/pagination";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/ux-states";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { TierSwitch } from "@/components/ui/tier-switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReturnModal } from "@/components/dresses/return-modal";
import { toast } from "@/lib/toast-utils";
import { useRealtime } from "@/hooks/use-realtime";

const PAGE_SIZE = 20;
const REALTIME_REFRESH_DELAY_MS = 600;

interface StandaloneRentalsClientProps {
  initialResult?: {
    rentals: DressRental[];
    total: number;
    page: number;
    pageSize: number;
  };
}

const STATUS_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Đã đặt", value: "reserved" },
  { label: "Đang thuê", value: "renting" },
  { label: "Đã trả", value: "returned" },
  { label: "Quá hạn", value: "overdue" },
  { label: "Đã hủy", value: "cancelled" },
];

// ─── HELPERS ────────────────────────────────

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const fmtPrice = (v: number | null | undefined) =>
  v ? new Intl.NumberFormat("vi-VN").format(v) + "đ" : "—";

import { RentalRow, RentalCard, CalendarView } from './standalone-rentals-views';

// ─── MAIN COMPONENT ─────────────────────────

export default function StandaloneRentalsClient({ initialResult }: StandaloneRentalsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Read filters from URL ──
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || searchParams.get("q") || "";
  const itemId = searchParams.get("item_id") || "";
  const page = Number(searchParams.get("page")) || 1;
  const view = searchParams.get("view") || "list";

  // 📡 Realtime — auto-refresh on dress_rentals changes
  useRealtime("dress_rentals", {
    onChange: () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        void revalidateByPrefixes([cacheKeys.dressRentals(), cacheKeys.dresses()]);
      }, REALTIME_REFRESH_DELAY_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ── SWR data ──
  const { data: result, isLoading, error, mutate } = useSWR(
    [cacheKeys.dressRentals(), status, search, itemId, page],
    async () => {
      const res = await fetchAllRentals({
        status: status !== "all" ? status : undefined,
        search: search || undefined,
        itemId: itemId || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      if (!res.success) {
        throw new Error(res.error || "Khong the tai danh sach don thue trang phuc");
      }
      return res.data;
    },
    { keepPreviousData: true, fallbackData: initialResult },
  );

  const rentals: DressRental[] = result?.rentals || [];
  const totalCount = result?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Action states ──
  const [actionLoading, setActionLoading] = useState(false);
  const [returnRental, setReturnRental] = useState<DressRental | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  // ── URL handlers ──
  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "") params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const handlePageChange = useCallback((newPage: number) => {
    setFilter("page", newPage > 1 ? String(newPage) : "");
  }, [setFilter]);

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasFilters = status !== "all" || !!search || !!itemId;

  // Actions
  const patchRentalStatus = (rentalId: string, nextStatus: string) => {
    void mutate((current) => {
      if (!current) return current;
      return {
        ...current,
        rentals: current.rentals.map((rental) =>
          rental.id === rentalId ? { ...rental, status: nextStatus } : rental,
        ),
      };
    }, { revalidate: false });
  };

  const handleStart = async (id: string) => {
    if (actionLoading) return;
    const rental = rentals.find((item) => item.id === id);
    if (!rental) return;

    setActionLoading(true);
    try {
      await runOptimisticMutation({
        apply: () => patchRentalStatus(id, "renting"),
        rollback: () => patchRentalStatus(id, rental.status),
        action: () => startRental(id) as Promise<{ success: boolean; error?: string }>,
        onSuccess: () => {
          toast("Đã bắt đầu thuê!", "success");
          void mutate();
          void revalidateByPrefixes([cacheKeys.dressRentals(), cacheKeys.dresses()]);
        },
        onError: (error) => {
          toast(error instanceof Error ? error.message : "Lỗi khi bắt đầu thuê", "error");
        },
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelConfirmed = async () => {
    if (!cancelId || actionLoading) return;
    const rental = rentals.find((item) => item.id === cancelId);
    if (!rental) return;

    setActionLoading(true);
    try {
      await runOptimisticMutation({
        apply: () => patchRentalStatus(cancelId, "cancelled"),
        rollback: () => patchRentalStatus(cancelId, rental.status),
        action: () => cancelRental(cancelId) as Promise<{ success: boolean; error?: string }>,
        onSuccess: () => {
          toast("Đã hủy đặt thuê", "success");
          void mutate();
          void revalidateByPrefixes([cacheKeys.dressRentals(), cacheKeys.dresses()]);
        },
        onError: (error) => {
          toast(error instanceof Error ? error.message : "Lỗi khi hủy", "error");
        },
      });
    } finally {
      setActionLoading(false);
      setCancelId(null);
    }
  };
  return (
    <div className="main-container gap-3!">

      {/* 1 ─── Breadcrumb ─── */}
      <Breadcrumb items={[
        { label: "Trang phục", href: "/dresses" },
        { label: "Đơn thuê vãng lai" },
      ]} />

      {/* 2 ─── Stats summary ─── */}
      <div className="flex items-center gap-3 py-2.5 px-4 bg-bg-card rounded-xl shadow-sm w-max">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface">
          <ShoppingBag className="w-4 h-4 text-text-muted" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-h3 tabular-nums tracking-tight font-semibold text-text-primary leading-none">
            {totalCount}
          </span>
          <span className="text-caption text-text-muted font-medium">đơn vãng lai</span>
        </div>
      </div>

      {/* 3 ─── Filters + View Toggle ─── */}
      <TierSwitch
        phone={
          <div className="flex flex-col gap-3">
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <TabsFilter
                tabs={STATUS_TABS}
                activeTab={status}
                onChange={(val) => setFilter("status", val)}
                variant="pills"
              />
            </div>
            <div className="flex items-center justify-end mt-1">
              <div className="flex items-center bg-bg-hover p-1 rounded-lg gap-1 shrink-0">
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { setFilter("view", "list"); } }}  onClick={() => setFilter("view", "list")}  className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-bg-card shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary"}`} aria-label="Danh sách" >
                  <List size={16} />
                </div>
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { setFilter("view", "calendar"); } }}  onClick={() => setFilter("view", "calendar")}  className={`p-1.5 rounded-md transition-colors ${view === "calendar" ? "bg-bg-card shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary"}`} aria-label="Lịch" >
                  <Calendar size={16} />
                </div>
              </div>
            </div>
          </div>
        }
        desktop={
          <div className="flex items-center justify-between gap-3">
            <TabsFilter
              tabs={STATUS_TABS}
              activeTab={status}
              onChange={(val) => setFilter("status", val)}
            />
            <div className="flex items-center justify-end">
              <div className="flex items-center bg-bg-hover p-1 rounded-lg gap-1">
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { setFilter("view", "list"); } }}  onClick={() => setFilter("view", "list")}  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === "list" ? "bg-bg-card shadow-sm text-text-primary font-medium" : "text-text-secondary hover:text-text-primary"}`} >
                  Danh sách
                </div>
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { setFilter("view", "calendar"); } }}  onClick={() => setFilter("view", "calendar")}  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === "calendar" ? "bg-bg-card shadow-sm text-text-primary font-medium" : "text-text-secondary hover:text-text-primary"}`} >
                  <Calendar size={14} className="inline mr-1" />
                  Lịch
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* 4 ─── Loading ─── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-sm text-text-secondary">Đang tải...</span>
        </div>
      )}

      {/* 5 ─── Error ─── */}
      {error && !isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="error-text">Lỗi tải dữ liệu</p>
        </div>
      )}

      {/* 6 ─── Empty ─── */}
      {!isLoading && !error && rentals.length === 0 && (
        hasFilters ? (
          <EmptyState
            icon={FilterX}
            title="Không tìm thấy"
            description="Không tìm thấy đơn thuê phù hợp bộ lọc"
            actionLabel="Xóa bộ lọc"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="Chưa có đơn thuê vãng lai"
            description="Đặt thuê trang phục từ trang chi tiết váy"
          />
        )
      )}

      {/* 7 ─── Content ─── */}
      {!isLoading && !error && rentals.length > 0 && (
        view === "calendar" ? (
          <CalendarView rentals={rentals} />
        ) : (
          <TierSwitch
            phone={
              <div className="space-y-2">
                {rentals.map((r) => (
                  <RentalCard
                    key={r.id}
                    rental={r}
                    onReturn={setReturnRental}
                    onStart={handleStart}
                    onCancel={setCancelId}
                  />
                ))}
              </div>
            }
            desktop={
              <TableWrapper>
                <THead>
                  <tr>
                    <TH>Trang phục</TH>
                    <TH>Khách hàng</TH>
                    <TH>Ngày thuê</TH>
                    <TH>Phí thuê</TH>
                    <TH>Cọc</TH>
                    <TH>Trạng thái</TH>
                    <TH>{" "}</TH>
                  </tr>
                </THead>
                <TBody>
                  {rentals.map((r) => (
                    <RentalRow
                      key={r.id}
                      rental={r}
                      onReturn={setReturnRental}
                      onStart={handleStart}
                      onCancel={setCancelId}
                    />
                  ))}
                </TBody>
              </TableWrapper>
            }
          />
        )
      )}

      {/* 8 ─── Pagination ─── */}
      {totalPages > 1 && (
        <>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={handlePageChange}
            className="mt-2"
          />
          <p className="text-center text-xs text-text-muted mt-1">
            Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} của {totalCount} đơn
          </p>
        </>
      )}

      {/* 9 ─── Return Modal ─── */}
      {returnRental && (
        <ReturnModal
          isOpen={!!returnRental}
          onClose={() => setReturnRental(null)}
          rental={returnRental}
          onSaved={() => { mutate(); revalidateByPrefixes([cacheKeys.dressRentals(), cacheKeys.dresses()]); revalidate(cacheKeys.dressStats()); }}
        />
      )}

      {/* 10 ─── Cancel Confirm ─── */}
      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancelConfirmed}
        title="Hủy đặt thuê"
        message="Bạn chắc chắn muốn hủy đơn đặt thuê này?"
        confirmLabel={actionLoading ? "Đang hủy..." : "Xác nhận hủy"}
        variant="danger"
      />
    </div>
  );
}
