"use client";

import { useState, useCallback, type FormEvent } from "react";
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

  const handleChangeCostName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setForm(c => ({ ...c, cost_name: e.target.value })), []);
  const handleChangeCostCode = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setForm(c => ({ ...c, cost_code: e.target.value })), []);
  const handleChangeCostType = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setForm(c => ({ ...c, cost_type: e.target.value })), []);
  const handleChangeMonthlyAmount = useCallback((value: number) => setForm(c => ({ ...c, monthly_amount: value })), []);
  const handleChangeDepositAmount = useCallback((value: number) => setForm(c => ({ ...c, deposit_amount: value })), []);
  const handleChangeStartDate = useCallback((value: string) => setForm(c => ({ ...c, start_date: value })), []);
  const handleChangeEndDate = useCallback((value: string) => setForm(c => ({ ...c, end_date: value })), []);
  const handleChangeDescription = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(c => ({ ...c, description: e.target.value })), []);

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
    onClose();
    onSaved();
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
          <Input label="Tên chi phí" value={form.cost_name} onChange={handleChangeCostName} required />
          <Input label="Mã chi phí" value={form.cost_code} onChange={handleChangeCostCode} />
          <Input label="Loại chi phí" value={form.cost_type} onChange={handleChangeCostType} />
          <CurrencyInput label="Số tiền tháng" value={form.monthly_amount} onChange={handleChangeMonthlyAmount} required />
          <CurrencyInput label="Tiền cọc" value={form.deposit_amount} onChange={handleChangeDepositAmount} />
          <DatePicker label="Bắt đầu" value={form.start_date} onChange={handleChangeStartDate} />
          <DatePicker label="Kết thúc" value={form.end_date} onChange={handleChangeEndDate} />
        </div>
        <Textarea label="Mô tả" value={form.description} onChange={handleChangeDescription} rows={3} />
      </form>
    </UnifiedModal>
  );
}
