"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createGoal } from "@/app/actions/goal-budget-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function GoalFormModal({ isOpen, onClose, onSaved }: GoalFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: 0, deadline: "", notes: "" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await createGoal({
      name: form.name,
      target_amount: form.target_amount,
      deadline: form.deadline || undefined,
      notes: form.notes || undefined,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã tạo mục tiêu.");
    setForm({ name: "", target_amount: 0, deadline: "", notes: "" });
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm mục tiêu"
      size="lg"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="goal-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu mục tiêu"}
          </Button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={submit} className="space-y-4">
        <Input label="Tên mục tiêu" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        <CurrencyInput label="Số tiền mục tiêu" value={form.target_amount} onChange={(value) => setForm((current) => ({ ...current, target_amount: value }))} required />
        <DatePicker label="Hạn hoàn thành" value={form.deadline} onChange={(value) => setForm((current) => ({ ...current, deadline: value }))} />
        <Textarea label="Ghi chú" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
      </form>
    </UnifiedModal>
  );
}
