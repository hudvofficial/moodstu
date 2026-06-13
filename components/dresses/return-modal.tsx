"use client";

/**
 * 🏷️ ReturnModal — Form trả trang phục (damage fee + condition tracking)
 *
 * Pattern: UnifiedModal + SelectForm + CurrencyInput + ConfirmDialog
 * Actions: returnDressRental → dress status = cleaning
 * Gold Standard: rental-modal.tsx (post-audit fix)
 */

import { useState, useCallback, useEffect } from "react";
import { AlertTriangle, StickyNote } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { returnDressRental } from "@/app/actions/rental-mutations";
import { toast } from "@/lib/toast-utils";
import { revalidate, revalidateByPrefixes, cacheKeys } from "@/lib/swr";
import { formatVnd } from "@/lib/utils";
import type { DressRental } from "@/types/dress";

// ═══════════════════════════════════════════
// Props + FormState
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rental: DressRental;
  onSaved: () => void;
}

interface FormState {
  return_condition: string;
  damage_fee: number;
  deposit_returned: boolean;
  notes: string;
}

const CONDITION_OPTIONS = [
  { value: "good", label: "Tốt — Không hư hại" },
  { value: "minor_damage", label: "Hư hại nhẹ — Trầy xước, bẩn nhỏ" },
  { value: "major_damage", label: "Hư hại nặng — Rách, hỏng nghiêm trọng" },
];

function getInitial(): FormState {
  return {
    return_condition: "good",
    damage_fee: 0,
    deposit_returned: true,
    notes: "",
  };
}

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export function ReturnModal({ isOpen, onClose, rental, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => getInitial());
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // W1: Reset form khi reopen. Adjust state during render instead of in an effect
  // to avoid a cascading render.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setForm(getInitial());
    }
  }

  const update = useCallback((field: keyof FormState, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const hasDamage = form.return_condition === "minor_damage" || form.return_condition === "major_damage";

  const handleConfirmedSubmit = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      const result = await returnDressRental({
        rental_id: rental.id,
        return_condition: form.return_condition,
        damage_fee: hasDamage ? form.damage_fee : 0,
        deposit_returned: form.deposit_returned,
        notes: form.notes.trim() || null,
      }) as { success: boolean; error?: string };

      if (!result.success) {
        toast(result.error || "Có lỗi xảy ra", "error");
      } else {
        toast("Trả trang phục thành công!", "success");
        onClose();
        onSaved();
        void revalidateByPrefixes(cacheKeys.dresses());
        void revalidate(cacheKeys.dressStats());
      }
    } catch {
      toast("Lỗi khi trả trang phục", "error");
    } finally {
      setSaving(false);
    }
  };

  // Format date helper
  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("vi-VN"); } catch { return d; }
  };

  // Footer slot sticky
  const footer = (
    <div className="form-actions">
      <Button unstyled type="button" onClick={onClose} className="btn btn-ghost">Đóng</Button>
      <Button unstyled
        type="button"
        onClick={() => setShowConfirm(true)}
        className="btn btn-primary"
        disabled={saving || !form.return_condition}
      >
        {saving ? "Đang xử lý..." : "Xác nhận trả"}
      </Button>
    </div>
  );

  return (
    <>
      <UnifiedModal
        isOpen={isOpen}
        onClose={onClose}
        title="Trả trang phục"
        footer={footer}
      >
        <div className="space-y-4">
          {/* Info đơn thuê — read-only */}
          <h4 className="section-title">Thông tin đơn thuê</h4>

          <div className="card-base p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-text-muted text-sm">Khách hàng</span>
              <span className="text-sm font-medium">{rental.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted text-sm">Ngày lấy</span>
              <span className="text-sm">{fmtDate(rental.pickup_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted text-sm">Ngày trả dự kiến</span>
              <span className="text-sm">{fmtDate(rental.return_date)}</span>
            </div>
            {rental.deposit > 0 && (
              <div className="flex justify-between">
                <span className="text-text-muted text-sm">Tiền cọc</span>
                <span className="text-sm font-medium">
                  {formatVnd(rental.deposit)}
                </span>
              </div>
            )}
          </div>

          {/* Tình trạng trả — SSOT SelectForm */}
          <h4 className="section-title">Tình trạng trả</h4>

          <SelectForm
            label="Tình trạng trang phục"
            value={form.return_condition}
            onChange={(v) => update("return_condition", v)}
            options={CONDITION_OPTIONS}
          />

          {/* Phí hư hại — chỉ hiện khi có damage */}
          {hasDamage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-warning text-sm">
                <AlertTriangle size={14} />
                <span>Trang phục bị hư hại — nhập phí bồi thường</span>
              </div>
              <CurrencyInput
                label="Phí hư hại"
                value={form.damage_fee}
                onChange={(v) => update("damage_fee", v)}
              />
            </div>
          )}

          {/* Hoàn cọc */}
          {rental.deposit > 0 && (
            <label className="flex items-center gap-3 cursor-pointer p-3 card-base">
              <Input unstyled withBaseStyles={false}
                type="checkbox"
                checked={form.deposit_returned}
                onChange={(e) => update("deposit_returned", e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <div>
                <span className="text-sm font-medium">Hoàn cọc cho khách</span>
                <p className="text-text-muted text-xs">
                  {formatVnd(rental.deposit)}
                </p>
              </div>
            </label>
          )}

          {/* Ghi chú */}
          <div>
            <label className="label-base">
              <StickyNote size={14} className="inline mr-1 text-text-muted" />
              Ghi chú trả
            </label>
            <Textarea unstyled
              className="input-base w-full min-h-20 resize-none"
              placeholder="Ghi chú về tình trạng, hư hại chi tiết..."
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
        </div>
      </UnifiedModal>

      {/* ConfirmDialog — vì trả váy không thể undo */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedSubmit}
        title="Xác nhận trả trang phục"
        message={`Trả trang phục cho ${rental.customer_name}? Tình trạng: ${CONDITION_OPTIONS.find(o => o.value === form.return_condition)?.label || form.return_condition}.${hasDamage && form.damage_fee > 0 ? ` Phí hư hại: ${formatVnd(form.damage_fee)}.` : ""}${form.deposit_returned && rental.deposit > 0 ? ` Hoàn cọc: ${formatVnd(rental.deposit)}.` : ""}`}
        confirmLabel="Xác nhận trả"
        variant="warning"
      />
    </>
  );
}
