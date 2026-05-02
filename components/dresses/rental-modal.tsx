"use client";

/**
 * 🏷️ RentalModal — Form đặt thuê trang phục cho khách vãng lai
 *
 * Pattern: UnifiedModal + DatePicker + CurrencyInput + form-grid-2col
 * Actions: createRental → dress status = reserved
 * Gold Standard: dress-form-modal.tsx
 */

import { useState, useCallback, useEffect } from "react";
import { User, Phone, StickyNote } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DatePicker from "@/components/ui/date-picker";
import { createRental } from "@/app/actions/rental-mutations";
import { toast } from "@/lib/toast-utils";
import { revalidate, revalidateByPrefixes, cacheKeys } from "@/lib/swr";
import type { DressItem } from "@/types/dress";

// ═══════════════════════════════════════════
// Props + FormState
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dress: DressItem;
  onSaved: () => void;
}

interface FormState {
  customer_name: string;
  phone: string;
  pickup_date: string;
  return_date: string;
  rental_price: number;
  deposit: number;
  accessories: string;
  notes: string;
}

function getInitial(dress: DressItem): FormState {
  return {
    customer_name: "",
    phone: "",
    pickup_date: new Date().toISOString().split("T")[0],
    return_date: "",
    rental_price: dress.rental_price || 0,
    deposit: 0,
    accessories: "",
    notes: "",
  };
}

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export function RentalModal({ isOpen, onClose, dress, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => getInitial(dress));
  const [saving, setSaving] = useState(false);

  // W1: Reset form khi reopen hoặc đổi dress (clone dress-form-modal.tsx pattern)
  useEffect(() => {
    if (isOpen) {
      setForm(getInitial(dress));
    }
  }, [isOpen, dress]);

  const update = useCallback((field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) return toast("Vui lòng nhập tên khách", "error");
    if (!form.phone.trim()) return toast("Vui lòng nhập SĐT", "error");
    if (!form.return_date) return toast("Vui lòng chọn ngày trả", "error");
    if (form.return_date <= form.pickup_date) return toast("Ngày trả phải sau ngày lấy", "error");

    setSaving(true);
    try {
      const result = await createRental({
        item_id: dress.id,
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        pickup_date: form.pickup_date,
        return_date: form.return_date,
        rental_price: form.rental_price,
        deposit: form.deposit,
        accessories: form.accessories.trim() || null,
        notes: form.notes.trim() || null,
      }) as { success: boolean; error?: string };

      if (!result.success) {
        toast(result.error || "Có lỗi xảy ra", "error");
      } else {
        toast("Đặt thuê thành công!", "success");
        onClose();
        onSaved();
        void revalidateByPrefixes(cacheKeys.dresses());
        void revalidate(cacheKeys.dressStats());
      }
    } catch {
      toast("Lỗi khi đặt thuê", "error");
    } finally {
      setSaving(false);
    }
  };

  // W2: Footer slot — sticky, không scroll cùng body (clone dress-form-modal.tsx)
  const footer = (
    <div className="form-actions">
      <Button type="button" variant="ghost" onClick={onClose}>Đóng</Button>
      <Button type="button" onClick={handleSubmit} disabled={saving}>
        {saving ? "Đang lưu..." : "Xác nhận đặt thuê"}
      </Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Đặt thuê — ${dress.name}`}
      footer={footer}
    >
      <div className="space-y-4">
        {/* Thông tin khách */}
        <h4 className="section-title">Thông tin khách</h4>

        <div className="form-grid-2col">
          {/* Tên khách */}
          <div>
            <label className="label-base">
              <User size={14} className="inline mr-1 text-text-muted" />
              Tên khách <span className="text-error">*</span>
            </label>
            <Input
              type="text"
              placeholder="Nguyễn Văn A"
              value={form.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
            />
          </div>

          {/* SĐT */}
          <div>
            <label className="label-base">
              <Phone size={14} className="inline mr-1 text-text-muted" />
              Số điện thoại <span className="text-error">*</span>
            </label>
            <Input
              type="tel"
              placeholder="0901 234 567"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
        </div>

        {/* C2: SSOT DatePicker thay native input type="date" */}
        <h4 className="section-title">Thời gian</h4>

        <div className="form-grid-2col">
          <DatePicker
            label="Ngày lấy"
            required
            value={form.pickup_date}
            onChange={(v) => update("pickup_date", v)}
            placeholder="Chọn ngày lấy"
          />
          <DatePicker
            label="Ngày trả dự kiến"
            required
            value={form.return_date}
            onChange={(v) => update("return_date", v)}
            placeholder="Chọn ngày trả"
          />
        </div>

        {/* Tài chính */}
        <h4 className="section-title">Tài chính</h4>

        <div className="form-grid-2col">
          <CurrencyInput
            label="Phí thuê"
            value={form.rental_price}
            onChange={(v) => update("rental_price", v)}
          />
          <CurrencyInput
            label="Tiền cọc"
            value={form.deposit}
            onChange={(v) => update("deposit", v)}
          />
        </div>

        {/* Phụ kiện + Ghi chú */}
        <h4 className="section-title">Chi tiết</h4>

        <div>
          <label className="label-base">Phụ kiện đi kèm</label>
          <Input
            type="text"
            placeholder="VD: Vương miện, khăn voan, giày..."
            value={form.accessories}
            onChange={(e) => update("accessories", e.target.value)}
          />
        </div>

        <div>
          <label className="label-base">
            <StickyNote size={14} className="inline mr-1 text-text-muted" />
            Ghi chú
          </label>
          <Textarea
            className="w-full min-h-20 resize-none"
            placeholder="Ghi chú thêm..."
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
      </div>
    </UnifiedModal>
  );
}
