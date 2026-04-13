"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createExpense } from "@/app/actions/expense-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { FinanceCategory } from "@/types/finance-operations";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: FinanceCategory[];
}

const today = () => new Date().toISOString().split("T")[0];

export function ExpenseFormModal({ isOpen, onClose, onSaved, categories }: ExpenseFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expense_date: today(),
    payment_method: "tien_mat",
    category_id: "",
    amount: 0,
    recipient: "",
    description: "",
  });

  const categoryOptions = useMemo(
    () => categories.filter((item) => item.type === "Chi").map((item) => ({ value: item.id, label: item.name })),
    [categories],
  );

  const setField = (field: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await createExpense({
      expense_date: form.expense_date,
      payment_method: form.payment_method as "tien_mat" | "chuyen_khoan",
      category_id: form.category_id || null,
      amount: form.amount,
      recipient: form.recipient || null,
      description: form.description || null,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã tạo phiếu chi.");
    setForm({
      expense_date: today(),
      payment_method: "tien_mat",
      category_id: "",
      amount: 0,
      recipient: "",
      description: "",
    });
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm phiếu chi"
      description="Phiếu mới sẽ ở trạng thái chờ duyệt."
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="expense-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu phiếu chi"}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4">
        <div className="form-grid-2col">
          <DatePicker label="Ngày chi" value={form.expense_date} onChange={(value) => setField("expense_date", value)} required />
          <SimpleSelect
            label="Phương thức"
            value={form.payment_method}
            onChange={(value) => setField("payment_method", value)}
            options={[
              { value: "tien_mat", label: "Tiền mặt" },
              { value: "chuyen_khoan", label: "Chuyển khoản" },
            ]}
          />
          <SimpleSelect
            label="Danh mục"
            value={form.category_id}
            onChange={(value) => setField("category_id", value)}
            options={categoryOptions}
            placeholder="Chọn danh mục chi"
          />
          <CurrencyInput label="Số tiền chi" value={form.amount} onChange={(value) => setField("amount", value)} required />
        </div>
        <Input label="Người nhận" value={form.recipient} onChange={(event) => setField("recipient", event.target.value)} />
        <Textarea label="Mô tả" value={form.description} onChange={(event) => setField("description", event.target.value)} rows={3} />
      </form>
    </UnifiedModal>
  );
}
