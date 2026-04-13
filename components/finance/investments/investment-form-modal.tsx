"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createInvestment, updateInvestment } from "@/app/actions/investment-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { InvestmentItem } from "@/types/finance-operations";

interface InvestmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: InvestmentItem | null;
}

const today = () => new Date().toISOString().split("T")[0];

export function InvestmentFormModal({ isOpen, onClose, onSaved, item }: InvestmentFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: item?.name || "",
    category: item?.category || "",
    purchase_date: item?.purchase_date || today(),
    purchase_price: item?.purchase_price || 0,
    useful_life_months: String(item?.useful_life_months || 36),
    salvage_value: item?.salvage_value || 0,
    location: item?.location || "",
    next_maintenance_date: item?.next_maintenance_date || "",
    notes: "",
  });

  const setField = (field: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      category: form.category,
      purchase_date: form.purchase_date,
      purchase_price: form.purchase_price,
      useful_life_months: Number(form.useful_life_months) || 36,
      depreciation_method: "straight_line",
      salvage_value: form.salvage_value,
      location: form.location || undefined,
      next_maintenance_date: form.next_maintenance_date || undefined,
      notes: form.notes || undefined,
    };
    const result = item ? await updateInvestment(item.id, payload, item.updated_at || undefined) : await createInvestment(payload);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(item ? "Đã cập nhật tài sản." : "Đã tạo tài sản.");
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? "Sửa tài sản" : "Thêm tài sản"}
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="investment-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu tài sản"}
          </Button>
        </div>
      }
    >
      <form id="investment-form" onSubmit={submit} className="space-y-4">
        <div className="form-grid-2col">
          <Input label="Tên tài sản" value={form.name} onChange={(event) => setField("name", event.target.value)} required />
          <Input label="Danh mục" value={form.category} onChange={(event) => setField("category", event.target.value)} required />
          <DatePicker label="Ngày mua" value={form.purchase_date} onChange={(value) => setField("purchase_date", value)} required />
          <CurrencyInput label="Giá mua" value={form.purchase_price} onChange={(value) => setField("purchase_price", value)} required />
          <Input label="Vòng đời tháng" value={form.useful_life_months} inputMode="numeric" onChange={(event) => setField("useful_life_months", event.target.value.replace(/\D/g, ""))} />
          <CurrencyInput label="Giá trị thu hồi" value={form.salvage_value} onChange={(value) => setField("salvage_value", value)} />
          <Input label="Vị trí" value={form.location} onChange={(event) => setField("location", event.target.value)} />
          <DatePicker label="Bảo trì tiếp theo" value={form.next_maintenance_date} onChange={(value) => setField("next_maintenance_date", value)} />
        </div>
        <Textarea label="Ghi chú" value={form.notes} onChange={(event) => setField("notes", event.target.value)} rows={3} />
      </form>
    </UnifiedModal>
  );
}
