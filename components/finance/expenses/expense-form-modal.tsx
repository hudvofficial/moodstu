"use client";

import { useMemo, useState, useCallback, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { createExpense, updateExpense } from "@/app/actions/expense-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { FinanceCategory, ExpenseListItem } from "@/types/finance-operations";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  categories: FinanceCategory[];
  initialData?: ExpenseListItem | null;
}

const today = () => new Date().toISOString().split("T")[0];

import { PAYMENT_METHOD_OPTIONS } from "@/types/contract-constants";

export function ExpenseFormModal({ isOpen, onClose, onSaved, categories, initialData }: ExpenseFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expense_date: today(),
    payment_method: "tien_mat",
    category_id: "",
    amount: 0,
    recipient: "",
    description: "",
    contract_id: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          expense_date: initialData.expense_date,
          payment_method: initialData.payment_method,
          category_id: initialData.category_id || "",
          amount: initialData.amount,
          description: initialData.description || "",
          recipient: initialData.recipient || "",
          contract_id: initialData.contract_id || "",
        });
      } else {

        setForm({
          expense_date: today(),
          payment_method: "tien_mat",
          category_id: "",
          amount: 0,
          description: "",
          recipient: "",
          contract_id: "none",
        });
      }
    }
  }, [isOpen, initialData]);

  const categoryOptions = useMemo(
    () => categories.filter((item) => item.type === "chi").map((item) => ({ value: item.id, label: item.name })),
    [categories],
  );

  const handleChangeDate = useCallback((value: string) => setForm(curr => ({ ...curr, expense_date: value })), []);
  const handleChangePayment = useCallback((value: string) => setForm(curr => ({ ...curr, payment_method: value })), []);
  const handleChangeCategory = useCallback((value: string) => setForm(curr => ({ ...curr, category_id: value })), []);
  const handleChangeAmount = useCallback((value: number) => setForm(curr => ({ ...curr, amount: value })), []);
  const handleChangeRecipient = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setForm(curr => ({ ...curr, recipient: event.target.value })), []);
  const handleChangeDescription = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => setForm(curr => ({ ...curr, description: event.target.value })), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const payload = {
      expense_date: form.expense_date,
      payment_method: form.payment_method as "tien_mat" | "chuyen_khoan",
      category_id: form.category_id || null,
      amount: form.amount,
      recipient: form.recipient || null,
      description: form.description || null,
    };
    const isEdit = !!initialData;
    const editId = initialData?.id;
    const editUpdatedAt = initialData?.updated_at;

    // Đóng modal NGAY (close + revalidate) — phiếu chi là insert/update đơn giản, không totals tiền.
    // Finance 0 realtime → GIỮ onSaved() revalidate (không bỏ).
    setSaving(true);
    setForm({
      expense_date: today(),
      payment_method: "tien_mat",
      category_id: "",
      amount: 0,
      recipient: "",
      description: "",
      contract_id: "none",
    });
    onClose();
    try {
      const result =
        isEdit && editId
          ? await updateExpense(editId, payload, editUpdatedAt)
          : await createExpense(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Đã cập nhật phiếu chi." : "Đã tạo phiếu chi.");
      await Promise.resolve(onSaved());
    } finally {
      setSaving(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Sửa phiếu chi" : "Thêm phiếu chi"}
      description={initialData ? "Sửa thông tin phiếu chi." : "Phiếu mới sẽ ở trạng thái chờ duyệt."}
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="expense-form" disabled={saving}>
            {saving ? "Đang lưu" : initialData ? "Lưu thay đổi" : "Lưu phiếu chi"}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4">
        <div className="form-grid-2col">
          <DatePicker label="Ngày chi" value={form.expense_date} onChange={handleChangeDate} required />
          <SimpleSelect
            label="Phương thức"
            value={form.payment_method}
            onChange={handleChangePayment}
            options={PAYMENT_METHOD_OPTIONS}
          />
          <SimpleSelect
            label="Danh mục"
            value={form.category_id}
            onChange={handleChangeCategory}
            options={categoryOptions}
            placeholder="Chọn danh mục chi"
          />
          <CurrencyInput label="Số tiền chi" value={form.amount} onChange={handleChangeAmount} required />
        </div>
        <Input label="Người nhận" value={form.recipient} onChange={handleChangeRecipient} />
        <Textarea label="Mô tả" value={form.description} onChange={handleChangeDescription} rows={3} />
      </form>
    </UnifiedModal>
  );
}
