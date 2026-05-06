"use client";

/**
 * RentalHistoryClient — Full rental history page
 * Route: /dresses/rentals?item_id=xxx&status=rented&page=2
 * Pattern: Clone dresses-list-client.tsx structure
 */

import { useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import { Calendar, Loader2, FilterX } from "lucide-react";
import { fetchRentalHistory } from "@/app/actions/dress-queries";
import { RENTAL_HISTORY_PAGE_SIZE, RESERVATION_STATUS_MAP } from "@/types/dress-constants";
import type { RentalHistoryFilters, RentalHistoryRow } from "@/types/dress";
import { cacheKeys, revalidateByPrefixes } from "@/lib/swr";
import { useRealtime } from "@/hooks/use-realtime";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/ux-states";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { formatVnd } from "@/lib/utils";

const STATUS_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Đã đặt", value: "reserved" },
  { label: "Đang thuê", value: "rented" },
  { label: "Đã trả", value: "returned" },
];

// ─── HELPERS ────────────────────────────────

const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
const formatPrice = (v: number | null) => v ? formatVnd(v) : "—";

// ─── DESKTOP TABLE ROW ──────────────────────

function RentalRow({ row }: { row: RentalHistoryRow }) {
  const statusConfig = RESERVATION_STATUS_MAP[row.status || "reserved"] || RESERVATION_STATUS_MAP.reserved;

  return (
    <TR>
      <TD>
        <div className="flex items-center gap-2">
          {row.dresses?.item_code && (
            <span className="tag-badge text-xs">{row.dresses.item_code}</span>
          )}
          <span className="text-body-sm font-medium text-text-primary">
            {row.dresses?.name || "—"}
          </span>
        </div>
      </TD>
      <TD>
        {row.contracts?.contract_code ? (
          <Link href={`/contracts/${row.contracts.id}`} className="text-body-sm font-medium text-primary hover:underline">
            {row.contracts.contract_code}
          </Link>
        ) : "—"}
      </TD>
      <TD className="text-body-sm text-text-secondary">
        {row.contracts?.customers?.full_name || "—"}
      </TD>
      <TD className="text-body-sm font-medium">
        {formatPrice(row.rental_price)}
      </TD>
      <TD className="text-caption text-text-muted">
        {formatDate(row.start_date)} – {formatDate(row.end_date)}
      </TD>
      <TD>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </TD>
    </TR>
  );
}

// ─── MOBILE CARD ────────────────────────────

function RentalCard({ row }: { row: RentalHistoryRow }) {
  const statusConfig = RESERVATION_STATUS_MAP[row.status || "reserved"] || RESERVATION_STATUS_MAP.reserved;

  return (
    <div className="card-interactive p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {row.dresses?.item_code && (
            <span className="tag-badge text-xs">{row.dresses.item_code}</span>
          )}
          <span className="text-body-sm font-medium text-text-primary truncate">
            {row.dresses?.name || "—"}
          </span>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>
      <div className="flex items-center justify-between text-caption text-text-muted">
        <div className="flex items-center gap-2">
          {row.contracts?.contract_code ? (
            <Link href={`/contracts/${row.contracts.id}`} className="text-primary hover:underline">
              {row.contracts.contract_code}
            </Link>
          ) : "—"}
          <span>·</span>
          <span>{row.contracts?.customers?.full_name || "—"}</span>
        </div>
        <span className="font-medium text-text-secondary">{formatPrice(row.rental_price)}</span>
      </div>
      <p className="text-caption text-text-muted">
        {formatDate(row.start_date)} – {formatDate(row.end_date)}
      </p>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────

export default function RentalHistoryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Read filters from URL ──
  const status = (searchParams.get("status") || "all") as RentalHistoryFilters["status"];
  const itemId = searchParams.get("item_id") || undefined;
  const page = Number(searchParams.get("page")) || 1;

  const filters: RentalHistoryFilters = { status, item_id: itemId, page };

  // 📡 Realtime — auto-refresh on reservation changes
  useRealtime("dress_reservations", {
    onChange: () => {
      void revalidateByPrefixes(cacheKeys.dressRentals());
    },
  });

  // ── SWR data ──
  const { data, isLoading, error } = useSWR(
    [cacheKeys.dressRentals(), filters],
    () => fetchRentalHistory(filters),
    { keepPreviousData: true }
  );

  const rows = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / RENTAL_HISTORY_PAGE_SIZE);

  // ── Stats ──
  const countByStatus = {
    reserved: rows.filter(r => r.status === "reserved").length,
    rented: rows.filter(r => r.status === "rented").length,
    returned: rows.filter(r => r.status === "returned").length,
  };

  // ── URL handlers ──
  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page"); // reset page on filter change
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) params.set("page", String(newPage));
    else params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasFilters = status !== "all" || !!itemId;

  return (
    <div className="main-container gap-3!">

      {/* 1 ─── Breadcrumb ─── */}
      <Breadcrumb items={[
        { label: "Váy cưới", href: "/dresses" },
        { label: "Lịch sử cho thuê" },
      ]} />

      {/* 2 ─── Stats summary ─── */}
      <div className="flex items-center gap-6 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <span className="text-body-sm font-semibold">{totalCount}</span>
          <span className="text-caption text-text-muted">lượt cho thuê</span>
        </div>
        {status === "all" && totalCount > 0 && (
          <>
            <div className="text-caption text-text-muted">
              <span className="font-medium text-info">{countByStatus.reserved}</span> đã đặt
            </div>
            <div className="text-caption text-text-muted">
              <span className="font-medium text-warning">{countByStatus.rented}</span> đang thuê
            </div>
            <div className="text-caption text-text-muted">
              <span className="font-medium text-text-secondary">{countByStatus.returned}</span> đã trả
            </div>
          </>
        )}
      </div>

      {/* 3 ─── Filters ─── */}
      <TabsFilter
        tabs={STATUS_TABS}
        activeTab={status || "all"}
        onChange={(val) => setFilter("status", val)}
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
      {!isLoading && !error && rows.length === 0 && (
        hasFilters ? (
          <EmptyState
            icon={FilterX}
            title="Không tìm thấy"
            description="Không tìm thấy lượt cho thuê phù hợp bộ lọc"
            actionLabel="Xóa bộ lọc"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            icon={Calendar}
            title="Chưa có lịch sử cho thuê"
            description="Các lượt đặt và cho thuê trang phục sẽ hiển thị ở đây"
          />
        )
      )}

      {/* 7 ─── Desktop Table ─── */}
      {!isLoading && !error && rows.length > 0 && (
        <>
          {/* Desktop */}
          <TableWrapper className="hidden lg:block">
            <THead>
              <tr>
                <TH>Trang phục</TH>
                <TH>Hợp đồng</TH>
                <TH>Khách hàng</TH>
                <TH>Giá thuê</TH>
                <TH>Ngày thuê</TH>
                <TH>Trạng thái</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => (
                <RentalRow key={row.id} row={row} />
              ))}
            </TBody>
          </TableWrapper>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {rows.map((row) => (
              <RentalCard key={row.id} row={row} />
            ))}
          </div>
        </>
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
            Hiển thị {(page - 1) * RENTAL_HISTORY_PAGE_SIZE + 1}–
            {Math.min(page * RENTAL_HISTORY_PAGE_SIZE, totalCount)} của {totalCount} lượt
          </p>
        </>
      )}
    </div>
  );
}
