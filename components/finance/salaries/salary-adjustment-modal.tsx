"use client";

import { useState, useCallback, type FormEvent } from "react";
import { toast } from "sonner";
import { addSalaryAdjustment } from "@/app/actions/salary-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { SalaryItem } from "@/types/finance-operations";

interface SalaryAdjustmentModalProps {
  salary: SalaryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const today = () => new Date().toISOString().split("T")[0];

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "bonus", label: "Thưởng" },
  { value: "penalty", label: "Phạt" },
];

export function SalaryAdjustmentModal({ salary, onClose, onSaved }: SalaryAdjustmentModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "bonus", amount: 0, reason: "", date: today() });

  const handleChangeType = useCallback((value: string) => setForm((current) => ({ ...current, type: value })), []);
  const handleChangeDate = useCallback((value: string) => setForm((current) => ({ ...current, date: value })), []);
  const handleChangeAmount = useCallback((value: number) => setForm((current) => ({ ...current, amount: value })), []);
  const handleChangeReason = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => setForm((current) => ({ ...current, reason: event.target.value })), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!salary) return;
    // salary.id capture vào payload TRƯỚC onClose (đóng modal xoá selection cha).
    const payload = {
      employee_salary_id: salary.id,
      type: form.type as "bonus" | "penalty",
      amount: form.amount,
      reason: form.reason,
      date: form.date,
    };

    // Đóng modal NGAY (close + revalidate). Finance 0 realtime → GIỮ onSaved().
    setSaving(true);
    onClose();
    try {
      const result = await addSalaryAdjustment(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Đã thêm điều chỉnh lương.");
      await Promise.resolve(onSaved());
    } finally {
      setSaving(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={Boolean(salary)}
      onClose={onClose}
      title={salary ? `Điều chỉnh ${salary.employee_name}` : "Điều chỉnh lương"}
      size="lg"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="salary-adjustment-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu điều chỉnh"}
          </Button>
        </div>
      }
    >
      <form id="salary-adjustment-form" onSubmit={submit} className="space-y-4">
        <div className="form-grid-2col">
          <SimpleSelect
            label="Loại"
            value={form.type}
            onChange={handleChangeType}
            options={ADJUSTMENT_TYPE_OPTIONS}
          />
          <DatePicker label="Ngày" value={form.date} onChange={handleChangeDate} required />
          <CurrencyInput label="Số tiền" value={form.amount} onChange={handleChangeAmount} required />
        </div>
        <Textarea label="Lý do" value={form.reason} onChange={handleChangeReason} rows={3} required />
      </form>
    </UnifiedModal>
  );
}
