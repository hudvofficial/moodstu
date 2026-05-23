"use client";

import { useState, useTransition } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cancelOrder } from "@/app/actions/printing-workflow-mutations";
import type { PrintingOrderRow, PaymentMethod } from "@/types/printing";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PrintingOrderRow;
  onSuccess?: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ" },
  { value: "other", label: "Khác" },
];

export function CancelOrderModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: CancelOrderModalProps) {
  const [isPending, startTransition] = useTransition();

  const [reason, setReason] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("cash");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do hủy đơn");
      return;
    }

    if (refundAmount < 0) {
      toast.error("Số tiền hoàn không hợp lệ");
      return;
    }

    if (refundAmount > (order.paidAmount || 0)) {
      toast.error(
        `Số tiền hoàn không thể lớn hơn số đã thanh toán (${formatCurrency(order.paidAmount || 0)})`
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await cancelOrder({
          orderId: order.id,
          reason: reason.trim(),
          refundAmount: refundAmount > 0 ? refundAmount : undefined,
          refundMethod: refundAmount > 0 ? refundMethod : undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Không thể hủy đơn");
        }

        toast.success("Đã hủy đơn và hoàn trả kho thành công");

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
  const paidAmount = order.paidAmount || 0;

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
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Đã thanh toán:</span>
            <span className="font-medium text-success">
              {formatCurrency(paidAmount)} {CURRENCY_SYMBOL}
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

        {/* Refund Section */}
        {paidAmount > 0 && (
          <div className="space-y-3 p-3 border border-border rounded-lg">
            <h4 className="text-sm font-semibold text-text-main">Hoàn tiền</h4>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-main">
                Số tiền hoàn (tùy chọn)
              </label>
              <CurrencyInput
                value={refundAmount}
                onChange={setRefundAmount}
                placeholder="Nhập số tiền hoàn (nếu có)"
                disabled={isPending}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRefundAmount(paidAmount)}
                  disabled={isPending}
                >
                  Hoàn toàn bộ ({formatCurrency(paidAmount)})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRefundAmount(0)}
                  disabled={isPending}
                >
                  Không hoàn
                </Button>
              </div>
            </div>

            {refundAmount > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-main">
                  Phương thức hoàn tiền
                </label>
                <SelectForm
                  value={refundMethod}
                  onChange={(value) => setRefundMethod(value as PaymentMethod)}
                  options={PAYMENT_METHODS}
                  placeholder="Chọn phương thức"
                  disabled={isPending}
                />
              </div>
            )}
          </div>
        )}

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
