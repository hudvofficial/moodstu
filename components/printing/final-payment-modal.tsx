"use client";

import { useState, useTransition } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { recordFinalPayment } from "@/app/actions/printing-workflow-mutations";
import type { PrintingOrderRow, PaymentMethod } from "@/types/printing";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";

interface FinalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PrintingOrderRow;
  remainingAmount: number;
  onSuccess?: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "card", label: "Thẻ" },
  { value: "other", label: "Khác" },
];

export function FinalPaymentModal({
  isOpen,
  onClose,
  order,
  remainingAmount,
  onSuccess,
}: FinalPaymentModalProps) {
  const [isPending, startTransition] = useTransition();

  const [finalAmount, setFinalAmount] = useState<number>(remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (finalAmount <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0");
      return;
    }

    if (finalAmount < remainingAmount) {
      toast.error(
        `Số tiền chưa đủ tất toán. Còn lại: ${formatCurrency(remainingAmount)} ${CURRENCY_SYMBOL}`
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await recordFinalPayment({
          orderId: order.id,
          finalAmount,
          paymentMethod,
          paymentDate,
          notes: notes.trim() || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Không thể thu tất toán");
        }

        toast.success(
          `Đã thu tất toán ${formatCurrency(finalAmount)} ${CURRENCY_SYMBOL}`
        );

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

  const overpayment = finalAmount > remainingAmount ? finalAmount - remainingAmount : 0;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Thu tất toán"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-text-secondary">Đã thanh toán:</span>
            <span className="font-medium text-success">
              {formatCurrency(order.paidAmount || 0)} {CURRENCY_SYMBOL}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary font-semibold">Còn lại:</span>
            <span className="font-bold text-warning">
              {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
            </span>
          </div>
        </div>

        {/* Final Amount */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">
            Số tiền thanh toán <span className="text-error">*</span>
          </label>
          <CurrencyInput
            value={finalAmount}
            onChange={setFinalAmount}
            placeholder="Nhập số tiền thanh toán"
            required
            disabled={isPending}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFinalAmount(remainingAmount)}
              disabled={isPending}
            >
              Tất toán ({formatCurrency(remainingAmount)})
            </Button>
          </div>
          {overpayment > 0 && (
            <p className="text-xs text-warning">
              ⚠️ Thanh toán thừa: {formatCurrency(overpayment)} {CURRENCY_SYMBOL}
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">
            Phương thức thanh toán <span className="text-error">*</span>
          </label>
          <SelectForm
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value as PaymentMethod)}
            options={PAYMENT_METHODS}
            placeholder="Chọn phương thức"
            disabled={isPending}
          />
        </div>

        {/* Payment Date */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">
            Ngày thanh toán <span className="text-error">*</span>
          </label>
          <Input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            disabled={isPending}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">
            Ghi chú
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú (tùy chọn)"
            rows={2}
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
            variant="primary"
            disabled={isPending || finalAmount <= 0}
          >
            {isPending ? "Đang xử lý..." : "Xác nhận tất toán"}
          </Button>
        </div>
      </form>
    </UnifiedModal>
  );
}
