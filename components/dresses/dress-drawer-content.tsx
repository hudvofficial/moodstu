"use client";

/**
 * 📋 DressDrawerContent — Info + Rentals + Reservations
 *
 * Section 1: Dress info (0ms — from list data)
 * Section 2: Rental actions (Đặt thuê / Bắt đầu / Trả / Giặt xong)
 * Section 3: Standalone rentals (lazy-load)
 * Section 4: Contract reservations (lazy-load via SWR)
 */

import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { Shirt, Calendar, Undo2, Loader2, FileText, ShoppingBag, Play, CheckCircle, XCircle, WashingMachine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { DRESS_CATEGORY_MAP, DRESS_CONDITION_MAP, DRESS_STATUS_MAP, RESERVATION_STATUS_MAP } from "@/types/dress-constants";
import type { DressItem, DressReservation } from "@/types/dress";
import type { DressCategory, DressCondition, DressStatus } from "@/lib/validations/dress.schema";
import { fetchDressDetail } from "@/app/actions/dress-queries";
import { releaseReservation } from "@/app/actions/dress-mutations";
import { startRental, cancelRental, markCleaned } from "@/app/actions/rental-mutations";
import { fetchRentalsByItem, fetchActiveRental } from "@/app/actions/rental-queries";
import type { DressRental } from "@/types/dress";
import { RentalModal } from "@/components/dresses/rental-modal";
import { ReturnModal } from "@/components/dresses/return-modal";
import { cacheKeys, revalidate, revalidateByPrefixes } from "@/lib/swr";
import { toast } from "@/lib/toast-utils";
import { useState } from "react";



// ─── HELPERS ─────────────────────────────────────

function MetaItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-caption">{label}</span>
      <span className="text-body-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{value || "—"}</span>
    </div>
  );
}

// ─── INFO SECTION (0ms) ─────────────────────────

function InfoSection({ dress }: { dress: DressItem }) {
  const conditionLabel = dress.condition ? DRESS_CONDITION_MAP[dress.condition as DressCondition] : null;
  const categoryLabel = dress.category
    ? DRESS_CATEGORY_MAP[dress.category as DressCategory]?.label || dress.category
    : null;
  const formatPrice = (v: number | null) => v ? new Intl.NumberFormat("vi-VN").format(v) + "đ" : "—";

  return (
    <div className="space-y-4">
      {/* ── Image + Info cùng hàng (Stitch: flex gap-5) ── */}
      <div className="flex gap-4">
        {/* Image — 1/3 width */}
        <div className="shrink-0 bg-bg-hover rounded-xl overflow-hidden relative shadow-xs" style={{ width: 130, height: 173 }}>
          {dress.image_url ? (
            <Image src={dress.image_url} alt={dress.name} fill className="object-cover" sizes="120px" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted/30">
              <Shirt size={32} />
              <p className="text-caption mt-1">Chưa có ảnh</p>
            </div>
          )}
        </div>

        {/* Info — 2/3 width */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            {/* Badges: Mã + Tình trạng */}
            <div className="flex items-center gap-2 mb-3">
              <span className="tag-badge">{dress.item_code}</span>
              {conditionLabel && <Badge variant="neutral">{conditionLabel}</Badge>}
            </div>

            {/* Detail grid 2col (Stitch: grid-cols-2) */}
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-2">
              <MetaItem label="Danh mục" value={categoryLabel} />
              <MetaItem label="Size" value={dress.size} />
              <MetaItem label="Màu" value={dress.color} />
            </div>
          </div>

          {/* Prices — tách riêng, shadow separator (Lesson #64: no border) */}
          <div className="mt-3 pt-3" style={{ boxShadow: "inset 0 1px 0 var(--color-border-light)" }}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-caption text-text-muted">Giá thuê</span>
              <span className="text-lg font-bold text-primary tracking-tight">{formatPrice(dress.rental_price)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-caption text-text-muted">Giá bán</span>
              <span className="text-body-sm font-semibold">{formatPrice(dress.sale_price)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes — tonal card (Stitch: bg-surface-container-low p-4 rounded-xl) */}
      {dress.notes && (
        <div className="bg-bg-hover p-4 rounded-xl">
          <p className="text-body-sm text-text-secondary leading-relaxed">{dress.notes}</p>
        </div>
      )}

    </div>
  );
}

// ─── RESERVATION ROW ────────────────────────────

function ReservationRow({ r, onRelease, isReleasing }: { r: DressReservation; onRelease: (id: string) => void; isReleasing?: boolean }) {
  const statusConfig = RESERVATION_STATUS_MAP[r.status || "reserved"] || RESERVATION_STATUS_MAP.reserved;
  const canRelease = r.status === "reserved" || r.status === "rented";

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {r.contracts?.contract_code && (
            <Link href={`/contracts/${r.contracts.id}`} className="text-body-sm font-medium text-primary hover:underline">
              {r.contracts.contract_code}
            </Link>
          )}
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
        <p className="text-caption text-text-muted mt-0.5">
          {r.contracts?.customers?.full_name || "—"} · {formatDate(r.start_date)} – {formatDate(r.end_date)}
        </p>
      </div>
      {canRelease && (
        <Button unstyled onClick={() => onRelease(r.id)} className="btn btn-ghost text-xs gap-1 shrink-0" title="Trả trang phục" disabled={isReleasing}>
          <Undo2 size={14} /> Trả
        </Button>
      )}
    </div>
  );
}

// ─── RESERVATIONS SECTION (lazy SWR) ────────────

function ReservationsSection({ dressId }: { dressId: string }) {
  const [releasing, setReleasing] = useState<string | null>(null);

  const { data: detail, isLoading, mutate: mutateDetail } = useSWR(
    dressId ? cacheKeys.dressDetail(dressId) : null,
    () => fetchDressDetail(dressId),
  );

  const reservations = detail?.reservations || [];
  const displayReservations = reservations.slice(0, 5);
  const hasMore = reservations.length > 5;

  const handleRelease = async (reservationId: string) => {
    setReleasing(reservationId);
    try {
      const result = await releaseReservation(reservationId);
      if (result && "error" in result && result.error) {
        toast(String(result.error), "error");
      } else {
        toast("Đã trả trang phục", "success");
        mutateDetail();
        revalidateByPrefixes(cacheKeys.dresses());
        revalidate(cacheKeys.dressStats());
      }
    } catch {
      toast("Lỗi khi trả trang phục", "error");
    } finally {
      setReleasing(null);
    }
  };

  return (
    <div className="space-y-2 mt-6">
      <h4 className="section-title">Lịch đặt</h4>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}

      {!isLoading && displayReservations.length === 0 && (
        <EmptyState icon={Calendar} title="Chưa có lịch đặt" description="Trang phục chưa được đặt cho hợp đồng nào" />
      )}

      {!isLoading && displayReservations.length > 0 && (
        <div className="divide-y divide-border/30">
          {displayReservations.map((r) => (
            <ReservationRow key={r.id} r={r} onRelease={handleRelease} isReleasing={releasing === r.id} />
          ))}
        </div>
      )}

      {hasMore && (
        <Link href={`/dresses/rentals?item_id=${dressId}`} className="btn btn-ghost text-xs w-full mt-2">
          Xem tất cả ({reservations.length} lượt)
        </Link>
      )}
    </div>
  );
}

// ─── RENTAL ACTIONS ──────────────────────────────

function RentalActionsSection({ dress }: { dress: DressItem }) {
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const status = (dress.status as DressStatus) || "available";

  // Fetch active rental for this dress
  const { data: activeRentalResult, mutate: mutateActive } = useSWR(
    dress.id ? ["active-rental", dress.id] : null,
    async () => {
      const res = await fetchActiveRental(dress.id);
      return res && "data" in res ? res.data : null;
    },
  );
  const activeRental = activeRentalResult ?? null;

  const handleAction = async (action: () => Promise<unknown>, successMsg: string) => {
    setLoading(true);
    try {
      const result = await action() as { success: boolean; error?: string } | undefined;
      if (result && !result.success) {
        toast(result.error || "Có lỗi xảy ra", "error");
      } else {
        toast(successMsg, "success");
        revalidateByPrefixes(cacheKeys.dresses());
        revalidate(cacheKeys.dressStats());
        mutateActive();
      }
    } catch {
      toast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 mt-4">
      <h4 className="section-title">Hành động</h4>

      <div className="flex gap-2 flex-wrap">
        {/* Đặt cho hợp đồng - luôn show nếu available */}
        {status === "available" && (
          <Link href={`/contracts/new?dress_id=${dress.id}`} className="btn btn-ghost flex-1 gap-2">
            <FileText size={16} />
            Đặt cho hợp đồng
          </Link>
        )}

        {/* Đặt thuê vãng lai */}
        {status === "available" && (
          <Button unstyled onClick={() => setShowRentalModal(true)} className="btn btn-primary flex-1 gap-2">
            <ShoppingBag size={16} />
            Đặt thuê
          </Button>
        )}

        {/* Bắt đầu thuê */}
        {status === "reserved" && activeRental && (
          <Button unstyled
            onClick={() => handleAction(() => startRental(activeRental.id), "Đã bắt đầu thuê!")}
            disabled={loading}
            className="btn btn-primary w-full gap-2"
          >
            <Play size={16} />
            {loading ? "Đang xử lý..." : "Bắt đầu thuê"}
          </Button>
        )}

        {/* Hủy đặt */}
        {status === "reserved" && activeRental && (
          <Button unstyled
            onClick={() => handleAction(() => cancelRental(activeRental.id), "Đã hủy đặt thuê")}
            disabled={loading}
            className="btn btn-ghost text-error w-full gap-2"
          >
            <XCircle size={16} />
            Hủy đặt
          </Button>
        )}

        {/* Trả váy */}
        {(status === "rented" || status === "overdue") && activeRental && (
          <Button unstyled
            type="button"
            onClick={() => setShowReturnModal(true)}
            disabled={loading}
            className="btn btn-primary w-full gap-2"
          >
            <CheckCircle size={16} />
            Trả váy
          </Button>
        )}

        {/* Đã giặt xong */}
        {status === "cleaning" && (
          <Button unstyled
            onClick={() => handleAction(() => markCleaned(dress.id), "Đã giặt xong — sẵn sàng!")}
            disabled={loading}
            className="btn btn-primary w-full gap-2"
          >
            <WashingMachine size={16} />
            {loading ? "Đang xử lý..." : "Đã giặt xong"}
          </Button>
        )}

        {/* Status badge */}
        {status !== "available" && (
          <div className="text-center pt-1">
            <Badge variant={DRESS_STATUS_MAP[status]?.variant || "neutral"}>
              {DRESS_STATUS_MAP[status]?.label || status}
            </Badge>
          </div>
        )}
      </div>

      {/* Rental Modal */}
      <RentalModal
        isOpen={showRentalModal}
        onClose={() => setShowRentalModal(false)}
        dress={dress}
        onSaved={() => {
          mutateActive();
          revalidateByPrefixes(cacheKeys.dresses());
          revalidate(cacheKeys.dressStats());
        }}
      />

      {/* Return Modal */}
      {activeRental && (
        <ReturnModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          rental={activeRental}
          onSaved={() => {
            mutateActive();
            revalidateByPrefixes(cacheKeys.dresses());
            revalidate(cacheKeys.dressStats());
          }}
        />
      )}
    </div>
  );
}

// ─── STANDALONE RENTALS SECTION ──────────────────

function StandaloneRentalsSection({ dressId }: { dressId: string }) {
  const { data: rentalList, isLoading } = useSWR(
    dressId ? ["standalone-rentals", dressId] : null,
    async () => {
      const res = await fetchRentalsByItem(dressId);
      return res && "data" in res ? res.data : [];
    },
  );

  const list = rentalList || [];
  const displayRentals = list.slice(0, 5);
  const hasMore = list.length > 5;

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

  const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" }> = {
    reserved:  { label: "Đã đặt",    variant: "info" },
    renting:   { label: "Đang thuê", variant: "warning" },
    returned:  { label: "Đã trả",    variant: "success" },
    overdue:   { label: "Quá hạn",   variant: "error" },
    cancelled: { label: "Đã hủy",    variant: "neutral" },
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="w-4 h-4 text-primary animate-spin" />
    </div>
  );

  if (displayRentals.length === 0) return null;

  return (
    <div className="space-y-2 mt-6">
      <h4 className="section-title">Lịch sử thuê vãng lai</h4>
      <div className="space-y-1">
        {displayRentals.map((r: DressRental) => {
          const sc = STATUS_MAP[r.status] || STATUS_MAP.reserved;
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-medium">{r.customer_name}</span>
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                </div>
                <p className="text-caption text-text-muted mt-0.5">
                  {r.phone} · {formatDate(r.pickup_date)} – {formatDate(r.return_date)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <Link href={`/dresses/rentals?item_id=${dressId}`} className="btn btn-ghost text-xs w-full mt-1">
          Xem tất cả ({list.length} lượt)
        </Link>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ────────────────────────────────

export function DressDrawerContent({ dress }: { dress: DressItem }) {
  return (
    <div className="p-4 space-y-2">
      <InfoSection dress={dress} />
      <RentalActionsSection dress={dress} />
      <StandaloneRentalsSection dressId={dress.id} />
      <ReservationsSection dressId={dress.id} />
    </div>
  );
}
