"use client";

import { useState, useCallback, type FormEvent } from "react";
import { toast } from "sonner";
import { createFinanceCategory, updateFinanceCategory } from "@/app/actions/finance-category-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { FinanceCategory } from "@/types/finance-operations";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  category: FinanceCategory | null;
}

const CATEGORY_TYPE_OPTIONS = [
  { value: "thu", label: "Thu" },
  { value: "chi", label: "Chi" },
];

export function CategoryFormModal({ isOpen, onClose, onSaved, category }: CategoryFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: category?.name || "",
    type: category?.type || "chi",
    category_code: category?.category_code || "",
  });

  const handleChangeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setForm(c => ({ ...c, name: e.target.value })), []);
  const handleChangeType = useCallback((value: string) => setForm(c => ({ ...c, type: value })), []);
  const handleChangeCategoryCode = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setForm(c => ({ ...c, category_code: e.target.value })), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type as "thu" | "chi",
      category_code: form.category_code || undefined,
    };
    const result = category
      ? await updateFinanceCategory(category.id, payload)
      : await createFinanceCategory(payload);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(category ? "Đã cập nhật danh mục." : "Đã tạo danh mục.");
    onClose();
    onSaved();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? "Sửa danh mục" : "Thêm danh mục"}
      size="lg"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="category-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu danh mục"}
          </Button>
        </div>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-4">
        <Input label="Tên danh mục" value={form.name} onChange={handleChangeName} required />
        <div className="form-grid-2col">
          <SimpleSelect
            label="Loại"
            value={form.type}
            onChange={handleChangeType}
            options={CATEGORY_TYPE_OPTIONS}
          />
          <Input label="Mã danh mục" value={form.category_code} onChange={handleChangeCategoryCode} />
        </div>
      </form>
    </UnifiedModal>
  );
}
