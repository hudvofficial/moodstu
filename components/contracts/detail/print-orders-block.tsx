"use client";

import { useState } from "react";
import { Printer, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
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
  onAdd?: () => void;
}

const STATUS_ORDER = ["cho_xu_ly", "dat_coc", "dang_in", "da_in", "da_giao", "hoan_thanh"];

function isRollback(from: string | null | undefined, to: string) {
  const fromIndex = STATUS_ORDER.indexOf(from || "cho_xu_ly");
  const toIndex = STATUS_ORDER.indexOf(to);
  return fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex;
}

function requiresReason(from: string | null | undefined, to: string) {
  return to === "gap_su_co" || to === "huy_don" || isRollback(from, to);
}

interface PendingStatusChange {
  orderId: string;
  previous: string;
  next: string;
}

export default function PrintOrdersBlock({ orders, contractId, onStatusChange, onAdd }: Props) {
  const [localOrders, setLocalOrders] = useState(orders);
  const [pendingChange, setPendingChange] = useState<PendingStatusChange | null>(null);
  const [statusReason, setStatusReason] = useState("");

  // Sync with parent when data refreshes (e.g., Realtime update from another user)
  if (orders !== localOrders && orders.length !== localOrders.length) {
    setLocalOrders(orders);
  }

  const applyStatusUpdate = async (orderId: string, newStatus: string, previous: string, reason?: string) => {
    // 1. Optimistic update — instant UI
    setLocalOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    );

    // 2. Notify parent to mute Realtime echo
    onStatusChange?.();

    // 3. Fire-and-forget — rollback on error
    const result = await updatePrintOrderStatus(orderId, newStatus, contractId, reason);
    if (!result.success) {
      setLocalOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: previous } : o)
      );
      toast(result.error || "Lỗi cập nhật", "error");
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const previous = localOrders.find(o => o.id === orderId)?.status;
    if (!previous || previous === newStatus) return;

    if (requiresReason(previous, newStatus)) {
      setPendingChange({ orderId, previous, next: newStatus });
      setStatusReason("");
      return;
    }

    await applyStatusUpdate(orderId, newStatus, previous);
  };

  const confirmPendingChange = async () => {
    if (!pendingChange) return;
    const reason = statusReason.trim();
    if (!reason) {
      toast("Vui lòng nhập lý do", "warning");
      return;
    }

    const change = pendingChange;
    setPendingChange(null);
    setStatusReason("");
    await applyStatusUpdate(change.orderId, change.next, change.previous, reason);
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
        <div className="flex items-center gap-2">
          {localOrders.length > 0 && (
            <span className="text-caption text-text-muted">
              {localOrders.length} đơn
            </span>
          )}
          {onAdd && (
            <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="!px-2 !py-1 text-caption font-medium text-interactive hover:bg-interactive-light">
              <Plus size={14} className="mr-0.5" />
              Thêm
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {localOrders.length === 0 ? (
        <div className="py-6 text-center">
          <Printer size={28} className="text-text-muted/40 mx-auto mb-2" />
          <p className="text-caption text-text-muted">
            Chưa có đơn in ấn
          </p>
          {onAdd && (
            <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="mt-2 text-caption font-medium text-interactive hover:bg-interactive-light">
              <Plus size={14} className="mr-1" />
              Tạo đơn in
            </Button>
          )}
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
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-text-primary truncate">
                      {order.order_code || "Đơn in"}
                    </p>
                    {(order.status === "dat_coc" || order.payment_status === "partial" || order.payment_status === "paid") && (
                      <Badge variant="success" className="mt-1 text-micro">
                        Đã cọc
                      </Badge>
                    )}
                  </div>
                  <StatusSelect
                    current={order.status || "cho_xu_ly"}
                    options={[...PRINT_ORDER_STATUS_OPTIONS]}
                    variant="compact"
                    onUpdate={(newStatus) => handleStatusUpdate(order.id, newStatus)}
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

      <UnifiedModal
        isOpen={!!pendingChange}
        onClose={() => {
          setPendingChange(null);
          setStatusReason("");
        }}
        title="Nhập lý do thay đổi trạng thái"
        description="Bắt buộc khi báo sự cố, hủy đơn hoặc chuyển lùi quy trình."
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPendingChange(null);
                setStatusReason("");
              }}
            >
              Hủy
            </Button>
            <Button type="button" onClick={confirmPendingChange}>
              Xác nhận
            </Button>
          </div>
        )}
      >
        <Textarea
          value={statusReason}
          onChange={(event) => setStatusReason(event.target.value)}
          placeholder="VD: In sai màu, khách đổi yêu cầu, thao tác nhầm cần quay lại..."
          rows={4}
          autoFocus
        />
      </UnifiedModal>
    </div>
  );
}
