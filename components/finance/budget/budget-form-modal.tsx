"use client";

import { useState, useCallback, type FormEvent } from "react";
import { toast } from "sonner";
import { upsertBudget } from "@/app/actions/goal-budget-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  month: number;
  year: number;
}

export function BudgetFormModal({ isOpen, onClose, onSaved, month, year }: BudgetFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category_name: "", budget_amount: 0, notes: "" });

  const handleChangeCategory = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, category_name: event.target.value }));
  }, []);

  const handleChangeAmount = useCallback((value: number) => {
    setForm((current) => ({ ...current, budget_amount: value }));
  }, []);

  const handleChangeNotes = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, notes: event.target.value }));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      category_name: form.category_name,
      budget_amount: form.budget_amount,
      period_month: month,
      period_year: year,
      notes: form.notes || undefined,
    };

    // Đóng modal NGAY (close + revalidate). Finance 0 realtime → GIỮ onSaved().
    setSaving(true);
    setForm({ category_name: "", budget_amount: 0, notes: "" });
    onClose();
    try {
      const result = await upsertBudget(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Đã lưu ngân sách.");
      await Promise.resolve(onSaved());
    } finally {
      setSaving(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ngân sách tháng ${month}/${year}`}
      size="lg"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="budget-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu ngân sách"}
          </Button>
        </div>
      }
    >
      <form id="budget-form" onSubmit={submit} className="space-y-4">
        <Input label="Danh mục ngân sách" value={form.category_name} onChange={handleChangeCategory} required />
        <CurrencyInput label="Hạn mức" value={form.budget_amount} onChange={handleChangeAmount} required />
        <Textarea label="Ghi chú" value={form.notes} onChange={handleChangeNotes} rows={3} />
      </form>
    </UnifiedModal>
  );
}
