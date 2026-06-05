"use client";

import { useState } from "react";
import { CreditCard, Banknote, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatVnd, formatFinanceDate } from "@/components/finance/finance-format";
import type { DebtListItem } from "@/types/finance-operations";
import { payDebt } from "@/app/actions/debt-actions";
import { mutate, cacheKeys } from "@/lib/swr";

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtListItem | null;
}

export function DebtPaymentModal({ isOpen, onClose, debt }: DebtPaymentModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("chuyen_khoan");
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Reset form khi mở modal
  useState(() => {
    if (isOpen && debt) {
      setAmount(debt.remaining.toString());
      setNote(`Thanh toán nợ: ${debt.entity_name}`);
    }
  });

  if (!debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || numAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    const debtId = debt.id;
    const payload = { amount: numAmount, paymentMethod, note };

    // Đóng modal NGAY. payDebt recalc paid/remaining/status + sinh chứng từ thu/chi
    // → KHÔNG patch optimistic, chỉ mutate + revalidate sau khi xong.
    setLoading(true);
    onClose();
    try {
      await payDebt(debtId, payload);
      toast.success("Đã thanh toán công nợ và lưu vào dòng tiền.");
      void mutate(cacheKeys.debts());
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi thanh toán công nợ");
    } finally {
      setLoading(false);
    }
  };

  const handleSetMax = () => {
    setAmount(debt.remaining.toString());
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận thanh toán nợ"
      description={`Ghi nhận thanh toán cho đối tác: ${debt.entity_name}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {/* Số tiền */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="payment-amount" className="text-label text-text-primary font-medium">Số tiền thanh toán (VND)</label>
            <span className="text-caption text-text-muted">
              Còn nợ: {formatVnd(debt.remaining)}
            </span>
          </div>
          <div className="relative">
            <Input
              id="payment-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatVnd(parseInt(amount.replace(/\D/g, ""), 10) || 0).replace(" VND", "")}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              className="pr-16"
              autoFocus
            />
            <Button unstyled
              type="button"
              onClick={handleSetMax}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-caption text-brand hover:text-brand-dark px-2 py-1 rounded"
            >
              Tối đa
            </Button>
          </div>
        </div>

        {/* Phương thức thanh toán */}
        <div className="space-y-1.5">
          <label className="text-label text-text-primary font-medium block">Phương thức thanh toán</label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition-colors ${paymentMethod === "chuyen_khoan" ? "border-brand bg-brand/5 text-brand" : "border-border text-text-secondary hover:bg-surface-elevated"}`}>
              <Input unstyled type="radio" name="method" value="chuyen_khoan" checked={paymentMethod === "chuyen_khoan"} onChange={() => setPaymentMethod("chuyen_khoan")} className="sr-only" />
              <CreditCard className="w-4 h-4" />
              <span className="text-body-sm font-medium">Chuyển khoản</span>
            </label>
            <label className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition-colors ${paymentMethod === "tien_mat" ? "border-brand bg-brand/5 text-brand" : "border-border text-text-secondary hover:bg-surface-elevated"}`}>
              <Input unstyled type="radio" name="method" value="tien_mat" checked={paymentMethod === "tien_mat"} onChange={() => setPaymentMethod("tien_mat")} className="sr-only" />
              <Banknote className="w-4 h-4" />
              <span className="text-body-sm font-medium">Tiền mặt</span>
            </label>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="space-y-1.5">
          <label htmlFor="payment-note" className="text-label text-text-primary font-medium block">Nội dung (sẽ lưu vào dòng tiền)</label>
          <Textarea
            id="payment-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Khách CK trả nốt tiền váy..."
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button type="submit" variant="primary" disabled={loading || !amount}>Xác nhận thanh toán</Button>
        </div>
      </form>
    </UnifiedModal>
  );
}
