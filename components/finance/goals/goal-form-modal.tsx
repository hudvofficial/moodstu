"use client";

import { useState, useCallback, type FormEvent } from "react";
import { toast } from "sonner";
import { createGoal, updateGoal } from "@/app/actions/goal-budget-actions";
import type { GoalsCashflowData } from "@/app/actions/finance-operations-queries";
import { GOAL_COLOR_OPTIONS, GOAL_ICON_OPTIONS, GOAL_TEMPLATES, GoalIcon, resolveGoalColor } from "@/components/finance/goals/goal-visual";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { GoalItem } from "@/types/finance-operations";

interface GoalFormModalProps {
  isOpen: boolean;
  goal?: GoalItem | null;
  cashflow?: GoalsCashflowData | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM = { name: "", target_amount: 0, deadline: "", notes: "", icon: "savings", color: "emerald" };

function initialGoalForm(goal?: GoalItem | null) {
  if (!goal) return { ...EMPTY_FORM };
  return {
    name: goal.name || "",
    target_amount: goal.target_amount || 0,
    deadline: goal.deadline || "",
    notes: goal.notes || "",
    icon: GOAL_ICON_OPTIONS.some((ic) => ic.value === goal.icon) ? (goal.icon as string) : "savings",
    color: GOAL_COLOR_OPTIONS.some((c) => c.value === goal.color) ? (goal.color as string) : "emerald",
  };
}

export function GoalFormModal({ isOpen, goal, cashflow = null, onClose, onSaved }: GoalFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => initialGoalForm(goal));

  const handleChangeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setForm(c => ({ ...c, name: e.target.value })), []);
  const handleChangeTargetAmount = useCallback((value: number) => setForm(c => ({ ...c, target_amount: value })), []);
  const handleChangeDeadline = useCallback((value: string) => setForm(c => ({ ...c, deadline: value })), []);
  const handleChangeNotes = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(c => ({ ...c, notes: e.target.value })), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      target_amount: form.target_amount,
      deadline: form.deadline || undefined,
      icon: form.icon || undefined,
      color: form.color || undefined,
      notes: form.notes || undefined,
    };
    const editId = goal?.id;
    const editUpdatedAt = goal?.updated_at || undefined;

    // Đóng modal NGAY (close + revalidate) — mục tiêu là insert/update đơn giản.
    // Finance 0 realtime → GIỮ onSaved() revalidate.
    setSaving(true);
    setForm(EMPTY_FORM);
    onClose();
    try {
      const result = editId
        ? await updateGoal(editId, payload, editUpdatedAt)
        : await createGoal(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editId ? "Đã cập nhật mục tiêu." : "Đã tạo mục tiêu.");
      await Promise.resolve(onSaved());
    } finally {
      setSaving(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={goal ? "Sửa mục tiêu" : "Thêm mục tiêu"}
      size="lg"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="goal-form" disabled={saving}>
            {saving ? "Đang lưu" : goal ? "Lưu thay đổi" : "Lưu mục tiêu"}
          </Button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={submit} className="space-y-4">
        {!goal ? (
          <div className="space-y-2">
            <p className="text-caption font-semibold text-text-secondary uppercase tracking-wide">Gợi ý nhanh</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_TEMPLATES.map((template) => {
                const palette = resolveGoalColor(template.color);
                return (
                  <Button
                    key={template.name}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const burnRate =
                        (cashflow?.monthlyExpense || 0) +
                        (cashflow?.salaryComponent || 0) +
                        (cashflow?.fixedCostComponent || 0);
                      const suggestedAmount =
                        template.suggestedAmount > 0 ? template.suggestedAmount : burnRate > 0 ? burnRate * 6 : 0;
                      const deadline = (() => {
                        if (!template.suggestedMonths) return "";
                        const d = new Date();
                        d.setMonth(d.getMonth() + template.suggestedMonths);
                        return d.toISOString().slice(0, 10);
                      })();

                      setForm((c) => ({
                        ...c,
                        name: template.name,
                        icon: template.icon,
                        color: template.color,
                        target_amount: suggestedAmount > 0 ? suggestedAmount : c.target_amount,
                        deadline: deadline || c.deadline,
                      }));
                    }}
                    className={`justify-start gap-2 px-3 py-2 rounded-xl border transition-colors ${form.name === template.name ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-bg-sidebar/30"}`}
                  >
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${palette.iconBg}`}>
                      <GoalIcon value={template.icon} className={`w-4 h-4 ${palette.iconColor}`} />
                    </span>
                    <span className="text-body-sm font-semibold">{template.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}

        <Input label="Tên mục tiêu" value={form.name} onChange={handleChangeName} required />
        <CurrencyInput label="Số tiền mục tiêu" value={form.target_amount} onChange={handleChangeTargetAmount} required />
        <DatePicker label="Hạn hoàn thành" value={form.deadline} onChange={handleChangeDeadline} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-caption font-semibold text-text-secondary uppercase tracking-wide">Biểu tượng</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICON_OPTIONS.map((ic) => (
                <Button
                  key={ic.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((c) => ({ ...c, icon: ic.value }))}
                  className={`w-10 h-10 p-0 rounded-xl border transition-colors ${form.icon === ic.value ? "border-primary bg-primary/5" : "border-border hover:bg-bg-sidebar/30"}`}
                  aria-label={ic.label}
                  title={ic.label}
                >
                  <GoalIcon value={ic.value} className="w-5 h-5 text-text-secondary" />
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-caption font-semibold text-text-secondary uppercase tracking-wide">Màu sắc</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_COLOR_OPTIONS.map((c) => (
                <Button
                  key={c.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((s) => ({ ...s, color: c.value }))}
                  className={`w-10 h-10 p-0 rounded-xl border transition-colors ${form.color === c.value ? "border-primary ring-2 ring-primary/30 ring-offset-1" : "border-border hover:bg-bg-sidebar/30"}`}
                  aria-label={c.label}
                  title={c.label}
                >
                  <span className={`w-6 h-6 rounded-lg ${c.iconBg}`} />
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Textarea label="Ghi chú" value={form.notes} onChange={handleChangeNotes} rows={3} />
      </form>
    </UnifiedModal>
  );
}
