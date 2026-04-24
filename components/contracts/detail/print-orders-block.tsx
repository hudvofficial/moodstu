"use client";

import { useState } from "react";
import { Printer, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { PrintingOrder } from "@/types/contract";
import StatusSelect, { PRINT_ORDER_STATUS_OPTIONS } from "@/components/ui/status-select";
import { updatePrintOrderStatus } from "@/app/actions/printing-actions";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// PrintOrdersBlock — Đơn in ấn
// Phase 04e: printing_orders JOIN labs
// ⚡ Optimistic UI: instant status update, fire-and-forget API
// ═══════════════════════════════════════════

interface Props {
  orders: PrintingOrder[];
  contractId: string;
  onStatusChange?: () => void;
}

export default function PrintOrdersBlock({ orders, contractId, onStatusChange }: Props) {
  const [localOrders, setLocalOrders] = useState(orders);

  // Sync with parent when data refreshes (e.g., Realtime update from another user)
  if (orders !== localOrders && orders.length !== localOrders.length) {
    setLocalOrders(orders);
  }

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    const previous = localOrders.find(o => o.id === orderId)?.status;
    if (!previous || previous === newStatus) return;

    // 1. Optimistic update — instant UI
    setLocalOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    );

    // 2. Notify parent to mute Realtime echo
    onStatusChange?.();

    // 3. Fire-and-forget — rollback on error
    updatePrintOrderStatus(orderId, newStatus, contractId).then(result => {
      if (!result.success) {
        // Rollback
        setLocalOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, status: previous } : o)
        );
        toast(result.error || "Lỗi cập nhật", "error");
      }
    });
  };

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
        {localOrders.length > 0 && (
          <span className="text-caption text-text-muted">
            {localOrders.length} đơn
          </span>
        )}
      </div>

      {/* Content */}
      {localOrders.length === 0 ? (
        <div className="py-6 text-center">
          <Printer size={28} className="text-text-muted/40 mx-auto mb-2" />
          <p className="text-caption text-text-muted">
            Chưa có đơn in ấn
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {localOrders.map((order) => {
            return (
              <div
                key={order.id}
                className="p-2.5 rounded-md bg-bg-hover"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-body-sm font-semibold text-text-primary truncate">
                    {order.order_code || "Đơn in"}
                  </p>
                  <StatusSelect
                    current={order.status || "cho_xu_ly"}
                    options={[...PRINT_ORDER_STATUS_OPTIONS]}
                    variant="compact"
                    onUpdate={async (newStatus) => handleStatusUpdate(order.id, newStatus)}
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
