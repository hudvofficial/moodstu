"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { createPaymentReceipt, getTransactionCategories } from "@/app/actions/payment-actions";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { toast } from "@/lib/toast-utils";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { PaymentPlan } from "@/types/contract";
import { SimpleSelect } from "@/components/ui/simple-select";

// ═══════════════════════════════════════════
// Payment Receipt Form — V1 business logic → V2
// Phase 04A: Props-based data (no client Supabase)
// paymentPlans come from SWR via parent
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractCode: string;
  remainingAmount: number;
  paymentPlans: PaymentPlan[];
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

export default function PaymentReceiptForm({
  isOpen,
  onClose,
  contractId,
  contractCode,
  remainingAmount,
  paymentPlans,
}: Props) {
  const isFullyPaid = remainingAmount <= 0;

  // ── Form state ──
  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [method, setMethod] = useState<"tien_mat" | "chuyen_khoan">("tien_mat");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [updateTotal, setUpdateTotal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // ── Fetch categories on mount ──
  useEffect(() => {
    if (!isOpen) return;
    getTransactionCategories("Thu").then((result) => {
      if (result.success && result.data) {
        setCategories(result.data as CategoryOption[]);
      }
    });
  }, [isOpen]);

  // ── Auto-select first unpaid plan ──
  const unpaidPlans = useMemo(
    () => paymentPlans.filter((p) => p.status !== "paid"),
    [paymentPlans]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (unpaidPlans.length > 0 && !selectedPlanId) {
      const firstUnpaid = unpaidPlans[0];
      setSelectedPlanId(firstUnpaid.id);
      setAmount(firstUnpaid.amount);
    }
  }, [isOpen, unpaidPlans, selectedPlanId]);

  // ── Reset form ──
  const resetForm = useCallback(() => {
    setAmount(0);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setMethod("tien_mat");
    setSelectedPlanId(null);
    setCategoryId(null);
    setNotes("");
    setUpdateTotal(false);
  }, []);

  // ── Plan selection → pre-fill amount ──
  const handlePlanChange = useCallback(
    (planId: string) => {
      if (planId === "custom") {
        setSelectedPlanId(null);
        setAmount(0);
        return;
      }
      setSelectedPlanId(planId);
      const plan = paymentPlans.find((p) => p.id === planId);
      if (plan) setAmount(plan.amount);
    },
    [paymentPlans]
  );

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    const numAmount = amount;
    if (numAmount <= 0) {
      toast("Vui lòng nhập số tiền hợp lệ", "warning");
      return;
    }
    if (isFullyPaid && !notes.trim()) {
      toast("Vui lòng nhập lý do phát sinh", "warning");
      return;
    }

    setLoading(true);
    try {
      const result = await createPaymentReceipt({
        contractId,
        amount: numAmount,
        paymentDate,
        paymentMethod: method,
        paymentStage: selectedPlanId
          ? paymentPlans.find((p) => p.id === selectedPlanId)?.stage_name || null
          : null,
        categoryId,
        notes: notes.trim() || null,
        paymentPlanId: selectedPlanId,
        updateTotal: isFullyPaid && updateTotal,
      });

      if (result.success) {
        toast(isFullyPaid ? "Đã tạo phiếu phát sinh" : "Đã tạo phiếu thu", "success");
        resetForm();
        onClose();
        await revalidateContractCaches(contractId);
      } else {
        toast(result.error || "Lỗi tạo phiếu thu", "error");
      }
    } catch {
      toast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  }, [
    amount, contractId, paymentDate, method, selectedPlanId,
    categoryId, notes, isFullyPaid, updateTotal, paymentPlans,
    resetForm, onClose,
  ]);

  const themeColor = isFullyPaid ? "var(--color-warning)" : "var(--color-interactive)";

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={() => { resetForm(); onClose(); }}
      title={isFullyPaid ? "Tạo phiếu phát sinh" : "Tạo phiếu thu"}
      description={contractCode}
    >
      <div className="space-y-4">
        <div>
          <label className="label-base mb-1 block">Số tiền *</label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            autoFocus
          />
          {remainingAmount > 0 && (
            <p className="text-xs text-text-muted mt-1">
              Còn lại: {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
            </p>
          )}
        </div>

        {/* Payment date */}
        <div>
          <label className="label-base mb-1 block">Ngày thu</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="input-base w-full"
          />
        </div>

        {/* Payment plan selector */}
        {paymentPlans.length > 0 && (
          <SimpleSelect
            value={selectedPlanId || "custom"}
            onChange={(v) => handlePlanChange(v)}
            options={[
              ...paymentPlans.map((plan) => ({
                value: plan.id,
                label: `${plan.status === "paid" ? "✅ " : ""}${plan.stage_name} — ${formatCurrency(plan.amount)} ${CURRENCY_SYMBOL}`,
              })),
              { value: "custom", label: "Thanh toán khác / Phát sinh" },
            ]}
            label="Đợt thanh toán"
          />
        )}

        {/* Payment method */}
        <div>
          <label className="label-base mb-1 block">Hình thức</label>
          <div className="flex gap-2">
            {(["tien_mat", "chuyen_khoan"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 h-10 rounded-md text-sm font-medium transition-all
                  ${method === m
                    ? "text-white shadow-sm"
                    : "bg-bg-hover text-text-secondary hover:bg-bg-secondary"
                  }`}
                style={method === m ? { background: themeColor } : undefined}
              >
                {m === "tien_mat" ? "Tiền mặt" : "Chuyển khoản"}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        {categories.length > 0 && (
            <SimpleSelect
            value={categoryId || ""}
            onChange={(v) => setCategoryId(v || null)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            label="Danh mục"
            placeholder="Chọn danh mục"
          />
        )}

        {/* Notes */}
        <div>
          <label className="label-base mb-1 block">
            {isFullyPaid ? "Lý do phát sinh *" : "Ghi chú"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isFullyPaid ? "Nhập lý do phát sinh..." : "Ghi chú thêm..."}
            rows={2}
            className="input-base w-full resize-none"
          />
        </div>

        {/* Update total checkbox (phát sinh only) */}
        {isFullyPaid && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={updateTotal}
              onChange={(e) => setUpdateTotal(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-text-secondary">
              Cập nhật giá trị HĐ (tăng tổng tiền)
            </span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="btn btn-outline flex-1"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || amount <= 0}
            className="btn btn-primary flex-1 disabled:opacity-50"
            style={{ background: themeColor }}
          >
            {loading ? "Đang xử lý..." : isFullyPaid ? "Tạo phát sinh" : "Tạo phiếu thu"}
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}
