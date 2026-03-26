"use client";

/**
 * 📋 StandaloneRentalsClient — Quản lý đơn thuê vãng lai
 * Route: /dresses/rentals
 *
 * Pattern: Clone rental-history-client.tsx (searchParams + SWR + TabsFilter + Pagination)
 * Data: fetchAllRentals (dress_rentals table — standalone, NOT contract reservations)
 * Status: RENTAL_STATUS_MAP (SSOT from dress-constants.ts)
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import {
  ShoppingBag, Loader2, ChevronRight, FilterX,
  Calendar, Phone, CheckCircle, XCircle, Play, List,
} from "lucide-react";
import { fetchAllRentals } from "@/app/actions/rental-queries";
import { startRental, cancelRental } from "@/app/actions/rental-mutations";
import { RENTAL_STATUS_MAP } from "@/types/dress-constants";
import type { DressRental } from "@/types/dress";
import { cacheKeys, revalidate } from "@/lib/swr";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/ux-states";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReturnModal } from "@/components/dresses/return-modal";
import { toast } from "@/lib/toast-utils";

const PAGE_SIZE = 20;

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

// ─── DESKTOP TABLE ROW ──────────────────────

function RentalRow({
  rental, onReturn, onStart, onCancel,
}: {
  rental: DressRental;
  onReturn: (r: DressRental) => void;
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const cfg = RENTAL_STATUS_MAP[rental.status] || RENTAL_STATUS_MAP.reserved;

  return (
    <tr className="border-b border-border-light hover:bg-bg-hover transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {rental.item_code && <span className="tag-badge text-xs">{rental.item_code}</span>}
          <span className="text-body-sm font-medium text-text-primary truncate">
            {rental.item_name || "—"}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div>
          <p className="text-body-sm font-medium">{rental.customer_name}</p>
          {rental.phone && (
            <p className="text-caption text-text-muted flex items-center gap-1">
              <Phone size={11} /> {rental.phone}
            </p>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-caption text-text-muted">
        {fmtDate(rental.pickup_date)} – {fmtDate(rental.return_date)}
      </td>
      <td className="py-3 px-4 text-body-sm font-medium">{fmtPrice(rental.rental_price)}</td>
      <td className="py-3 px-4 text-body-sm text-text-secondary">{fmtPrice(rental.deposit)}</td>
      <td className="py-3 px-4">
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          {rental.status === "reserved" && (
            <button type="button" onClick={() => onStart(rental.id)} className="btn btn-ghost btn-xs gap-1">
              <Play size={12} /> Bắt đầu
            </button>
          )}
          {(rental.status === "renting" || rental.status === "overdue") && (
            <button type="button" onClick={() => onReturn(rental)} className="btn btn-ghost btn-xs gap-1">
              <CheckCircle size={12} /> Trả
            </button>
          )}
          {rental.status === "reserved" && (
            <button type="button" onClick={() => onCancel(rental.id)} className="btn btn-ghost btn-xs text-error gap-1">
              <XCircle size={12} /> Hủy
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── MOBILE CARD ────────────────────────────

function RentalCard({
  rental, onReturn, onStart, onCancel,
}: {
  rental: DressRental;
  onReturn: (r: DressRental) => void;
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const cfg = RENTAL_STATUS_MAP[rental.status] || RENTAL_STATUS_MAP.reserved;

  return (
    <div className="card-interactive p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {rental.item_code && <span className="tag-badge text-xs">{rental.item_code}</span>}
          <span className="text-body-sm font-medium text-text-primary truncate">
            {rental.item_name || "—"}
          </span>
        </div>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      <div className="flex items-center justify-between text-caption text-text-muted">
        <div className="flex items-center gap-1">
          <span className="font-medium text-text-primary">{rental.customer_name}</span>
          {rental.phone && (
            <>
              <span>·</span>
              <span>{rental.phone}</span>
            </>
          )}
        </div>
        <span className="font-medium text-text-secondary">{fmtPrice(rental.rental_price)}</span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-caption text-text-muted">
          {fmtDate(rental.pickup_date)} – {fmtDate(rental.return_date)}
        </p>
        <div className="flex items-center gap-1">
          {rental.status === "reserved" && (
            <button type="button" onClick={() => onStart(rental.id)} className="btn btn-ghost btn-xs gap-1">
              <Play size={12} /> Bắt đầu
            </button>
          )}
          {(rental.status === "renting" || rental.status === "overdue") && (
            <button type="button" onClick={() => onReturn(rental)} className="btn btn-ghost btn-xs gap-1">
              <CheckCircle size={12} /> Trả
            </button>
          )}
          {rental.status === "reserved" && (
            <button type="button" onClick={() => onCancel(rental.id)} className="btn btn-ghost btn-xs text-error gap-1">
              <XCircle size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ──────────────────────────

function CalendarView({ rentals }: { rentals: DressRental[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const monthName = new Date(year, month).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Build day → rentals map
  const dayMap = new Map<number, DressRental[]>();
  rentals.forEach((r) => {
    const start = new Date(r.pickup_date);
    const end = new Date(r.return_date);
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      if (cellDate >= start && cellDate <= end) {
        const list = dayMap.get(d) || [];
        list.push(r);
        dayMap.set(d, list);
      }
    }
  });

  const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <div className="card-base p-4 space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="btn btn-ghost btn-xs">←</button>
        <span className="text-body-sm font-semibold capitalize">{monthName}</span>
        <button type="button" onClick={nextMonth} className="btn btn-ghost btn-xs">→</button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-caption font-medium text-text-muted py-1">{w}</div>
        ))}
        {/* Empty cells for first day offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} className="aspect-square" />
        ))}
        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const items = dayMap.get(day) || [];
          const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

          return (
            <div
              key={day}
              className={`aspect-square p-0.5 border border-border-light rounded text-xs relative ${isToday ? "bg-primary/10 font-bold" : ""}`}
            >
              <span className={`text-caption ${isToday ? "text-primary" : "text-text-muted"}`}>{day}</span>
              {items.length > 0 && (
                <div className="absolute bottom-0.5 left-0.5 right-0.5 flex gap-0.5 flex-wrap">
                  {items.slice(0, 3).map((r) => {
                    const cfg = RENTAL_STATUS_MAP[r.status];
                    const colorClass = cfg?.variant === "warning" ? "bg-warning"
                      : cfg?.variant === "info" ? "bg-info"
                      : cfg?.variant === "error" ? "bg-error"
                      : cfg?.variant === "success" ? "bg-success"
                      : "bg-text-muted";
                    return (
                      <div key={r.id} className={`w-1.5 h-1.5 rounded-full ${colorClass}`} title={`${r.customer_name} — ${cfg?.label}`} />
                    );
                  })}
                  {items.length > 3 && <span className="text-[8px] text-text-muted">+{items.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-caption text-text-muted pt-2 border-t border-border/30">
        {Object.entries(RENTAL_STATUS_MAP).map(([key, cfg]) => {
          const colorClass = cfg.variant === "warning" ? "bg-warning"
            : cfg.variant === "info" ? "bg-info"
            : cfg.variant === "error" ? "bg-error"
            : cfg.variant === "success" ? "bg-success"
            : "bg-text-muted";
          return (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${colorClass}`} />
              <span>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────

export default function StandaloneRentalsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Read filters from URL ──
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const view = searchParams.get("view") || "list";

  // ── SWR data ──
  const { data: result, isLoading, error, mutate } = useSWR(
    [cacheKeys.dresses(), "standalone-rentals", status, search, page],
    async () => {
      const res = await fetchAllRentals({
        status: status !== "all" ? status : undefined,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      return res && "data" in res ? res.data : { rentals: [], total: 0, page: 1, pageSize: PAGE_SIZE };
    },
    { keepPreviousData: true },
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

  const hasFilters = status !== "all" || !!search;

  // ── Actions ──
  const handleStart = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await startRental(id) as { success: boolean; error?: string };
      if (!res.success) toast(res.error || "Lỗi", "error");
      else { toast("Đã bắt đầu thuê!", "success"); mutate(); revalidate(cacheKeys.dresses()); }
    } catch { toast("Lỗi khi bắt đầu thuê", "error"); }
    finally { setActionLoading(false); }
  };

  const handleCancelConfirmed = async () => {
    if (!cancelId) return;
    setActionLoading(true);
    try {
      const res = await cancelRental(cancelId) as { success: boolean; error?: string };
      if (!res.success) toast(res.error || "Lỗi", "error");
      else { toast("Đã hủy đặt thuê", "success"); mutate(); revalidate(cacheKeys.dresses()); }
    } catch { toast("Lỗi khi hủy", "error"); }
    finally { setActionLoading(false); setCancelId(null); }
  };

  return (
    <div className="main-container gap-3!">

      {/* 1 ─── Breadcrumb ─── */}
      <nav className="flex items-center gap-1.5 text-caption text-text-muted">
        <Link href="/dresses" className="hover:text-text-primary transition-colors">
          Trang phục
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary font-medium">Đơn thuê vãng lai</span>
      </nav>

      {/* 2 ─── Stats summary ─── */}
      <div className="flex items-center gap-3 py-2.5 px-4 bg-bg-card rounded-xl shadow-xs w-max border border-border-light">
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

      {/* 3 ─── Filters + View Toggle (Match Gold Standard dresses-filters) ─── */}
      <>
        {/* MOBILE FILTERS */}
        <div className="lg:hidden flex flex-col gap-3">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <TabsFilter
              tabs={STATUS_TABS}
              activeTab={status}
              onChange={(val) => setFilter("status", val)}
              variant="pills"
            />
          </div>
          <div className="flex items-center justify-end mt-1">
            {/* View toggle icon only cho mobile */}
            <div className="flex items-center bg-bg-hover p-1 rounded-lg gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setFilter("view", "list")}
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-bg-card shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary"}`}
                aria-label="Danh sách"
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={() => setFilter("view", "calendar")}
                className={`p-1.5 rounded-md transition-colors ${view === "calendar" ? "bg-bg-card shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary"}`}
                aria-label="Lịch"
              >
                <Calendar size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP FILTERS */}
        <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
          <TabsFilter
            tabs={STATUS_TABS}
            activeTab={status}
            onChange={(val) => setFilter("status", val)}
          />
          <div className="flex items-center justify-end">
            {/* View toggle text + icon cho desktop */}
            <div className="flex items-center bg-bg-hover p-1 rounded-lg gap-1">
              <button
                type="button"
                onClick={() => setFilter("view", "list")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === "list" ? "bg-bg-card shadow-sm text-text-primary font-medium" : "text-text-secondary hover:text-text-primary"}`}
              >
                Danh sách
              </button>
              <button
                type="button"
                onClick={() => setFilter("view", "calendar")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === "calendar" ? "bg-bg-card shadow-sm text-text-primary font-medium" : "text-text-secondary hover:text-text-primary"}`}
              >
                <Calendar size={14} className="inline mr-1" />
                Lịch
              </button>
            </div>
          </div>
        </div>
      </>

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
          <>
            {/* Desktop table */}
            <div className="hidden lg:block bg-bg-card rounded-xl shadow-xs overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-caption text-text-muted uppercase font-medium">Trang phục</th>
                    <th className="text-left py-3 px-4 text-caption text-text-muted uppercase font-medium">Khách hàng</th>
                    <th className="text-left py-3 px-4 text-caption text-text-muted uppercase font-medium">Ngày thuê</th>
                    <th className="text-left py-3 px-4 text-caption text-text-muted uppercase font-medium">Phí thuê</th>
                    <th className="text-left py-3 px-4 text-caption text-text-muted uppercase font-medium">Cọc</th>
                    <th className="text-left py-3 px-4 text-caption text-text-muted uppercase font-medium">Trạng thái</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((r) => (
                    <RentalRow
                      key={r.id}
                      rental={r}
                      onReturn={setReturnRental}
                      onStart={handleStart}
                      onCancel={setCancelId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-2">
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
          </>
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
          onSaved={() => { mutate(); revalidate(cacheKeys.dresses()); revalidate(cacheKeys.dressStats()); }}
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
