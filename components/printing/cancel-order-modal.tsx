"use client";

import { useState, useTransition } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cancelOrder } from "@/app/actions/printing-workflow-mutations";
import type { PrintingOrderRow } from "@/types/printing";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PrintingOrderRow;
  onSuccess?: () => void;
}

// ADR-015 (2026-08-25): bỏ mục "Hoàn tiền" — khách không trả tiền Mood qua đơn in
// (ADR-014: in ấn là Mood ⇄ Lab thuần tuý), nên không có gì để hoàn khi hủy. Phần
// cũ gate theo order.paidAmount (không nơi nào nạp → không bao giờ hiện) là tàn dư
// luồng "đặt cọc" đã xoá, sót vì file này nằm ngoài locks của ADR-014.
export function CancelOrderModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: CancelOrderModalProps) {
  const [isPending, startTransition] = useTransition();

  const [reason, setReason] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do hủy đơn");
      return;
    }

    startTransition(async () => {
      try {
        const result = await cancelOrder({
          orderId: order.id,
          reason: reason.trim(),
        });

        if (!result.success) {
          throw new Error(result.error || "Không thể hủy đơn");
        }

        toast.success("Đã hủy đơn thành công");

        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Đã có lỗi xảy ra");
      }
    });
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const hasInventory = order.inventoryStatus === "reserved" || order.inventoryStatus === "stocked_out";

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Hủy đơn in"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Banner */}
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-warning">Cảnh báo</p>
            <p className="text-text-main">
              Hành động này sẽ hủy đơn in và không thể hoàn tác.
            </p>
            {hasInventory && (
              <ul className="list-disc list-inside text-text-secondary text-xs space-y-0.5 mt-2">
                {order.inventoryStatus === "reserved" && (
                  <li>Hủy các reservation vật tư đang giữ chỗ</li>
                )}
                {order.inventoryStatus === "stocked_out" && (
                  <li>Hoàn trả vật tư đã xuất kho vào tồn kho</li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Order Info */}
        <div className="p-3 bg-bg-hover rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Đơn hàng:</span>
            <span className="font-semibold text-text-main">{order.orderCode}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Khách hàng:</span>
            <span className="font-medium text-text-main">{order.customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Tổng đơn:</span>
            <span className="font-bold text-text-main">
              {formatCurrency(order.totalAmount)} {CURRENCY_SYMBOL}
            </span>
          </div>
        </div>

        {/* Cancellation Reason */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">
            Lý do hủy đơn <span className="text-error">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do hủy đơn (bắt buộc)"
            rows={3}
            required
            disabled={isPending}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={isPending || !reason.trim()}
          >
            {isPending ? "Đang xử lý..." : "Xác nhận hủy đơn"}
          </Button>
        </div>
      </form>
    </UnifiedModal>
  );
}
