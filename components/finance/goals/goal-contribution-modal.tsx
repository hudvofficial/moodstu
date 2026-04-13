"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { addContribution } from "@/app/actions/goal-budget-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { GoalItem } from "@/types/finance-operations";

interface GoalContributionModalProps {
  goal: GoalItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function GoalContributionModal({ goal, onClose, onSaved }: GoalContributionModalProps) {
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!goal) return;
    setSaving(true);
    const result = await addContribution(goal.id, amount, notes || undefined);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã ghi nhận khoản góp.");
    setAmount(0);
    setNotes("");
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={Boolean(goal)}
      onClose={onClose}
      title={goal ? `Góp vào ${goal.name}` : "Góp mục tiêu"}
      size="lg"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="goal-contribution-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu khoản góp"}
          </Button>
        </div>
      }
    >
      <form id="goal-contribution-form" onSubmit={submit} className="space-y-4">
        <CurrencyInput label="Số tiền góp" value={amount} onChange={setAmount} required />
        <Textarea label="Ghi chú" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </form>
    </UnifiedModal>
  );
}
