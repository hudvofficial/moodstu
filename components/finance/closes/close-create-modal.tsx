"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createMonthlyClose } from "@/app/actions/finance-close-actions";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";
import { UnifiedModal } from "@/components/ui/unified-modal";

interface CloseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialMonth: number;
  initialYear: number;
}

const months = Array.from({ length: 12 }, (_, index) => index + 1);

export function CloseCreateModal({ isOpen, onClose, onSaved, initialMonth, initialYear }: CloseCreateModalProps) {
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const years = [initialYear - 1, initialYear, initialYear + 1];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const result = await createMonthlyClose(period);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã tạo kỳ chốt sổ.");
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo kỳ chốt sổ"
      size="lg"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="close-create-form" disabled={saving}>
            {saving ? "Đang tạo" : "Tạo kỳ"}
          </Button>
        </div>
      }
    >
      <form id="close-create-form" onSubmit={submit} className="form-grid-2col">
        <SimpleSelect value={String(month)} onChange={(value) => setMonth(Number(value))} label="Tháng" options={months.map((item) => ({ value: String(item), label: `Tháng ${item}` }))} />
        <SimpleSelect value={String(year)} onChange={(value) => setYear(Number(value))} label="Năm" options={years.map((item) => ({ value: String(item), label: String(item) }))} />
      </form>
    </UnifiedModal>
  );
}
