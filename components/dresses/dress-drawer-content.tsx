"use client";

/**
 * 📋 DressDrawerContent — Info + Reservations sections
 *
 * Section 1: Dress info (0ms — from list data)
 * Section 2: Reservations (lazy-load via SWR)
 */

import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { Shirt, Calendar, Undo2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/ux-states";
import { DRESS_CONDITION_MAP, RESERVATION_STATUS_MAP } from "@/types/dress-constants";
import type { DressItem, DressReservation } from "@/types/dress";
import type { DressCondition } from "@/lib/validations/dress.schema";
import { fetchDressDetail } from "@/app/actions/dress-queries";
import { releaseReservation } from "@/app/actions/dress-mutations";
import { cacheKeys, revalidate } from "@/lib/swr";
import { toast } from "@/lib/toast-utils";
import { useState } from "react";



// ─── INFO SECTION (0ms) ─────────────────────────

function InfoSection({ dress }: { dress: DressItem }) {
  const conditionLabel = dress.condition ? DRESS_CONDITION_MAP[dress.condition as DressCondition] : null;
  const formatPrice = (v: number | null) => v ? new Intl.NumberFormat("vi-VN").format(v) + "đ" : "—";

  return (
    <div className="space-y-4">
      <h4 className="section-title">Thông tin</h4>

      {/* Image */}
      <div className="aspect-3/4 bg-bg-hover rounded-xl overflow-hidden relative max-w-[200px]">
        {dress.image_url ? (
          <Image src={dress.image_url} alt={dress.name} fill className="object-cover" sizes="200px" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted/30">
            <Shirt size={40} />
            <p className="text-caption mt-1">Chưa có ảnh</p>
          </div>
        )}
      </div>

      {/* Info grid 2 columns */}
      <div className="form-grid-2col gap-y-3">
        <div>
          <span className="text-caption text-text-muted">Mã</span>
          <p><span className="tag-badge">{dress.item_code}</span></p>
        </div>
        <div>
          <span className="text-caption text-text-muted">Danh mục</span>
          <p className="text-body-sm">{dress.category || "—"}</p>
        </div>
        <div>
          <span className="text-caption text-text-muted">Size</span>
          <p className="text-body-sm">{dress.size || "—"}</p>
        </div>
        <div>
          <span className="text-caption text-text-muted">Màu</span>
          <p className="text-body-sm">{dress.color || "—"}</p>
        </div>
        <div>
          <span className="text-caption text-text-muted">Giá thuê</span>
          <p className="text-body-sm font-semibold text-primary">{formatPrice(dress.rental_price)}</p>
        </div>
        <div>
          <span className="text-caption text-text-muted">Giá bán</span>
          <p className="text-body-sm">{formatPrice(dress.sale_price)}</p>
        </div>
        {conditionLabel && (
          <div>
            <span className="text-caption text-text-muted">Tình trạng</span>
            <p className="text-body-sm">{conditionLabel}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      {dress.notes && (
        <div>
          <span className="text-caption text-text-muted">Ghi chú</span>
          <p className="text-body-sm mt-0.5">{dress.notes}</p>
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
        <button onClick={() => onRelease(r.id)} className="btn btn-ghost text-xs gap-1 shrink-0" title="Trả trang phục" disabled={isReleasing}>
          <Undo2 size={14} /> Trả
        </button>
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
        revalidate(cacheKeys.dresses());
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

// ─── MAIN EXPORT ────────────────────────────────

export function DressDrawerContent({ dress }: { dress: DressItem }) {
  return (
    <div className="p-4 space-y-2">
      <InfoSection dress={dress} />
      <ReservationsSection dressId={dress.id} />
    </div>
  );
}
