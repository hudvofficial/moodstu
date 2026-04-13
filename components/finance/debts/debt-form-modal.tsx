"use client";

import { useState, useCallback, type FormEvent } from "react";
import { toast } from "sonner";
import { createDebt } from "@/app/actions/debt-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ENTITY_TYPE_OPTIONS = [
  { value: "khach_hang", label: "Khách hàng" },
  { value: "nha_cung_cap", label: "Nhà cung cấp" },
  { value: "nhan_vien", label: "Nhân viên" },
  { value: "khac", label: "Khác" },
];

const DEBT_TYPE_OPTIONS = [
  { value: "Phải thu", label: "Phải thu" },
  { value: "Phải trả", label: "Phải trả" },
];

export function DebtFormModal({ isOpen, onClose, onSaved }: DebtFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    entity_name: "",
    entity_type: "khach_hang",
    type: "Phải thu",
    amount: 0,
    due_date: "",
    notes: "",
  });

  const handleChangeEntityName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setForm(c => ({ ...c, entity_name: e.target.value })), []);
  const handleChangeEntityType = useCallback((value: string) => setForm(c => ({ ...c, entity_type: value })), []);
  const handleChangeType = useCallback((value: string) => setForm(c => ({ ...c, type: value })), []);
  const handleChangeAmount = useCallback((value: number) => setForm(c => ({ ...c, amount: value })), []);
  const handleChangeDueDate = useCallback((value: string) => setForm(c => ({ ...c, due_date: value })), []);
  const handleChangeNotes = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(c => ({ ...c, notes: e.target.value })), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await createDebt({
      entity_name: form.entity_name,
      entity_type: form.entity_type as "nha_cung_cap" | "khach_hang" | "nhan_vien" | "khac",
      type: form.type as "Phải thu" | "Phải trả",
      amount: form.amount,
      due_date: form.due_date || null,
      notes: form.notes || null,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã tạo công nợ.");
    setForm({ entity_name: "", entity_type: "khach_hang", type: "Phải thu", amount: 0, due_date: "", notes: "" });
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm công nợ"
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="debt-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu công nợ"}
          </Button>
        </div>
      }
    >
      <form id="debt-form" onSubmit={submit} className="space-y-4">
        <div className="form-grid-2col">
          <Input label="Đối tượng" value={form.entity_name} onChange={handleChangeEntityName} required />
          <SimpleSelect
            label="Nhóm"
            value={form.entity_type}
            onChange={handleChangeEntityType}
            options={ENTITY_TYPE_OPTIONS}
          />
          <SimpleSelect
            label="Loại công nợ"
            value={form.type}
            onChange={handleChangeType}
            options={DEBT_TYPE_OPTIONS}
          />
          <CurrencyInput label="Số tiền" value={form.amount} onChange={handleChangeAmount} required />
          <DatePicker label="Hạn thanh toán" value={form.due_date} onChange={handleChangeDueDate} />
        </div>
        <Textarea label="Ghi chú" value={form.notes} onChange={handleChangeNotes} rows={3} />
      </form>
    </UnifiedModal>
  );
}
