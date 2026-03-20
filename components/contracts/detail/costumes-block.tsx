import Image from "next/image";
import { Shirt } from "lucide-react";
import type { InventoryReservation } from "@/types/contract";
import StatusSelect, { RESERVATION_STATUS_OPTIONS } from "@/components/ui/status-select";
import { updateReservationStatus } from "@/app/actions/printing-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// CostumesBlock — Trang phục đã chọn
// Phase 04e: inventory_reservations JOIN inventory_items
// ═══════════════════════════════════════════

interface Props {
  reservations: InventoryReservation[];
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
        <div className="space-y-2.5">
          {reservations.map((r) => {
            const item = r.inventory_items;
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-hover"
              >
                {/* Thumbnail */}
                {item?.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shirt size={16} className="text-primary" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-text-primary truncate">
                    {item?.name || "—"}
                  </p>
                  <div className="flex items-center gap-2">
                    {item?.item_code && (
                      <span className="text-caption text-text-muted">
                        #{item.item_code}
                      </span>
                    )}
                    {item?.size && (
                      <span className="text-caption text-text-muted">
                        Size {item.size}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status dropdown */}
                <StatusSelect
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
            );
          })}
        </div>
      )}
    </div>
  );
}
