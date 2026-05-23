"use client";

import { useState, useTransition } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { recordDepositPayment } from "@/app/actions/printing-workflow-mutations";
import type { PrintingOrderRow, PaymentMethod } from "@/types/printing";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";

interface DepositPaymentModalProps {
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

export function DepositPaymentModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: DepositPaymentModalProps) {
  const [isPending, startTransition] = useTransition();

  const [depositAmount, setDepositAmount] = useState<number>(order.totalAmount * 0.3); // Default 30%
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (depositAmount <= 0) {
      toast.error("Số tiền đặt cọc phải lớn hơn 0");
      return;
    }

    if (depositAmount > order.totalAmount) {
      toast.error("Số tiền đặt cọc không thể lớn hơn tổng đơn");
      return;
    }

    startTransition(async () => {
      try {
        const result = await recordDepositPayment({
          orderId: order.id,
          depositAmount,
          paymentMethod,
          paymentDate,
          notes: notes.trim() || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Không thể thu đặt cọc");
        }

        toast.success(
          `Đã thu đặt cọc ${formatCurrency(depositAmount)} ${CURRENCY_SYMBOL}`
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

  const remainingAfterDeposit = order.totalAmount - depositAmount;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Thu đặt cọc"
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
            <span className="font-bold text-primary">
              {formatCurrency(order.totalAmount)} {CURRENCY_SYMBOL}
            </span>
          </div>
        </div>

        {/* Deposit Amount */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-main">
            Số tiền đặt cọc <span className="text-error">*</span>
          </label>
          <CurrencyInput
            value={depositAmount}
            onChange={setDepositAmount}
            placeholder="Nhập số tiền đặt cọc"
            required
            disabled={isPending}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDepositAmount(order.totalAmount * 0.3)}
              disabled={isPending}
            >
              30%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDepositAmount(order.totalAmount * 0.5)}
              disabled={isPending}
            >
              50%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDepositAmount(order.totalAmount)}
              disabled={isPending}
            >
              100%
            </Button>
          </div>
          {depositAmount > 0 && (
            <p className="text-xs text-text-secondary">
              Còn lại: {formatCurrency(remainingAfterDeposit)} {CURRENCY_SYMBOL}
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
            disabled={isPending || depositAmount <= 0}
          >
            {isPending ? "Đang xử lý..." : "Xác nhận thu cọc"}
          </Button>
        </div>
      </form>
    </UnifiedModal>
  );
}
