"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createFixedCost, updateFixedCost } from "@/app/actions/fixed-cost-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { FixedCostItem } from "@/types/finance-operations";

interface FixedCostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: FixedCostItem | null;
}

export function FixedCostFormModal({ isOpen, onClose, onSaved, item }: FixedCostFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cost_code: item?.cost_code || "",
    cost_name: item?.cost_name || "",
    cost_type: item?.cost_type || "",
    monthly_amount: item?.monthly_amount || 0,
    deposit_amount: item?.deposit_amount || 0,
    start_date: item?.start_date || "",
    end_date: item?.end_date || "",
    description: item?.description || "",
  });

  const setField = (field: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description || null,
      cost_type: form.cost_type || null,
    };
    const result = item ? await updateFixedCost(item.id, payload) : await createFixedCost(payload);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(item ? "Đã cập nhật chi phí cố định." : "Đã tạo chi phí cố định.");
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? "Sửa chi phí cố định" : "Thêm chi phí cố định"}
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="fixed-cost-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu chi phí"}
          </Button>
        </div>
      }
    >
      <form id="fixed-cost-form" onSubmit={submit} className="space-y-4">
        <div className="form-grid-2col">
          <Input label="Tên chi phí" value={form.cost_name} onChange={(event) => setField("cost_name", event.target.value)} required />
          <Input label="Mã chi phí" value={form.cost_code} onChange={(event) => setField("cost_code", event.target.value)} />
          <Input label="Loại chi phí" value={form.cost_type} onChange={(event) => setField("cost_type", event.target.value)} />
          <CurrencyInput label="Số tiền tháng" value={form.monthly_amount} onChange={(value) => setField("monthly_amount", value)} required />
          <CurrencyInput label="Tiền cọc" value={form.deposit_amount} onChange={(value) => setField("deposit_amount", value)} />
          <DatePicker label="Bắt đầu" value={form.start_date} onChange={(value) => setField("start_date", value)} />
          <DatePicker label="Kết thúc" value={form.end_date} onChange={(value) => setField("end_date", value)} />
        </div>
        <Textarea label="Mô tả" value={form.description} onChange={(event) => setField("description", event.target.value)} rows={3} />
      </form>
    </UnifiedModal>
  );
}
