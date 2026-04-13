"use client";

import { useState, type FormEvent } from "react";
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

export function CategoryFormModal({ isOpen, onClose, onSaved, category }: CategoryFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: category?.name || "",
    type: category?.type || "Chi",
    category_code: category?.category_code || "",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type as "Thu" | "Chi",
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
    onSaved();
    onClose();
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
        <Input label="Tên danh mục" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        <div className="form-grid-2col">
          <SimpleSelect
            label="Loại"
            value={form.type}
            onChange={(value) => setForm((current) => ({ ...current, type: value }))}
            options={[
              { value: "Thu", label: "Thu" },
              { value: "Chi", label: "Chi" },
            ]}
          />
          <Input label="Mã danh mục" value={form.category_code} onChange={(event) => setForm((current) => ({ ...current, category_code: event.target.value }))} />
        </div>
      </form>
    </UnifiedModal>
  );
}
