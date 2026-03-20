import { Printer, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { PrintingOrder } from "@/types/contract";
import StatusSelect, { PRINT_ORDER_STATUS_OPTIONS } from "@/components/ui/status-select";
import { updatePrintOrderStatus } from "@/app/actions/printing-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// PrintOrdersBlock — Đơn in ấn
// Phase 04e: printing_orders JOIN labs
// ═══════════════════════════════════════════

// StatusSelect handles status display + updates

interface Props {
  orders: PrintingOrder[];
  contractId: string;
}

export default function PrintOrdersBlock({ orders, contractId }: Props) {
  return (
    <div className="card-base p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Printer size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            In ấn
          </h3>
        </div>
        {orders.length > 0 && (
          <span className="text-caption text-text-muted">
            {orders.length} đơn
          </span>
        )}
      </div>

      {/* Content */}
      {orders.length === 0 ? (
        <div className="py-6 text-center">
          <Printer size={28} className="text-text-muted/40 mx-auto mb-2" />
          <p className="text-caption text-text-muted">
            Chưa có đơn in ấn
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order) => {
            return (
              <div
                key={order.id}
                className="p-2.5 rounded-xl bg-bg-hover"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-body-sm font-semibold text-text-primary truncate">
                    {order.order_code || "Đơn in"}
                  </p>
                  <StatusSelect
                    current={order.status || "cho_xu_ly"}
                    options={[...PRINT_ORDER_STATUS_OPTIONS]}
                    onUpdate={async (newStatus) => {
                      const result = await updatePrintOrderStatus(order.id, newStatus, contractId);
                      if (result.success) {
                        toast("Cập nhật trạng thái thành công", "success");
                        await revalidateContractCaches(contractId);
                      } else {
                        toast(result.error || "Lỗi cập nhật", "error");
                      }
                    }}
                  />
                </div>

                <div className="flex items-center gap-3 text-caption text-text-muted">
                  {order.labs?.name && (
                    <span>Lab: {order.labs.name}</span>
                  )}
                  {order.expected_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(order.expected_date)}
                    </span>
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
