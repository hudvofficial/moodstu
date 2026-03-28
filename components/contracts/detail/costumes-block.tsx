import Image from "next/image";
import { Shirt, CalendarDays } from "lucide-react";
import type { DressReservationRow } from "@/types/contract";
import { formatDate } from "@/lib/utils";
import StatusSelect, { RESERVATION_STATUS_OPTIONS } from "@/components/ui/status-select";
import { updateReservationStatus } from "@/app/actions/printing-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// CostumesBlock — Trang phục đã chọn
// Phase 04e: dress_reservations JOIN dresses
// ═══════════════════════════════════════════

interface Props {
  reservations: DressReservationRow[];
  contractId: string;
}

export default function CostumesBlock({ reservations, contractId }: Props) {
  return (
    <div className="card-base p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shirt size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            Trang phục
          </h3>
        </div>
        {reservations.length > 0 && (
          <span className="text-caption text-text-muted">
            {reservations.length} bộ
          </span>
        )}
      </div>

      {/* Content */}
      {reservations.length === 0 ? (
        <div className="py-6 text-center">
          <Shirt size={28} className="text-text-muted/40 mx-auto mb-2" />
          <p className="text-caption text-text-muted">
            Chưa chọn trang phục
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {reservations.map((r) => {
            const item = r.dresses;
            return (
              <div
                key={r.id}
                className="flex items-start gap-3 p-2.5 rounded-md bg-bg-hover"
              >
                {/* Thumbnail */}
                {item?.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-md object-cover shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Shirt size={16} className="text-primary" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  {/* Row 1: Name + Status pill */}
                  <div className="flex items-center gap-2">
                    <p className="text-body-sm font-semibold text-text-primary line-clamp-1 flex-1 min-w-0">
                      {item?.name || "—"}
                    </p>
                    <StatusSelect
                      variant="compact"
                      current={r.status || "reserved"}
                      options={[...RESERVATION_STATUS_OPTIONS]}
                      onUpdate={async (newStatus) => {
                        const result = await updateReservationStatus(r.id, newStatus, contractId);
                        if (result.success) {
                          toast("Cập nhật thành công", "success");
                          await revalidateContractCaches(contractId);
                        } else {
                          toast(result.error || "Lỗi cập nhật", "error");
                        }
                      }}
                    />
                  </div>
                  {/* Row 2: Code + Size */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item?.item_code && (
                      <span className="text-caption text-text-muted">
                        #{item.item_code}
                      </span>
                    )}
                    {item?.size && (
                      <span className="text-caption text-text-muted">
                        · Size {item.size}
                      </span>
                    )}
                  </div>
                  {/* Row 3: Dates */}
                  {(r.start_date || r.end_date) && (
                    <p className="text-caption text-text-muted flex items-center gap-1 mt-0.5">
                      <CalendarDays size={11} className="shrink-0" />
                      {formatDate(r.start_date)} → {formatDate(r.end_date)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
