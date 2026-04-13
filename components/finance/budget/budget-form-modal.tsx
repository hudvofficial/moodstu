"use client";

import { useState, type FormEvent } from "react";
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await upsertBudget({
      category_name: form.category_name,
      budget_amount: form.budget_amount,
      period_month: month,
      period_year: year,
      notes: form.notes || undefined,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã lưu ngân sách.");
    setForm({ category_name: "", budget_amount: 0, notes: "" });
    onSaved();
    onClose();
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
        <Input label="Danh mục ngân sách" value={form.category_name} onChange={(event) => setForm((current) => ({ ...current, category_name: event.target.value }))} required />
        <CurrencyInput label="Hạn mức" value={form.budget_amount} onChange={(value) => setForm((current) => ({ ...current, budget_amount: value }))} required />
        <Textarea label="Ghi chú" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
      </form>
    </UnifiedModal>
  );
}
