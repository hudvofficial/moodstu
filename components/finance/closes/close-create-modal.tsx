"use client";

import { useState, useCallback, type FormEvent } from "react";
import { toast } from "sonner";
import { createMonthlyClose } from "@/app/actions/finance-close-actions";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { UnifiedModal } from "@/components/ui/unified-modal";

interface CloseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialMonth: number;
  initialYear: number;
}



export function CloseCreateModal({ isOpen, onClose, onSaved, initialMonth, initialYear }: CloseCreateModalProps) {
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);

  const handleMonthChange = useCallback((value: string) => setMonth(Number(value)), []);
  const handleYearChange = useCallback((value: string) => setYear(Number(value)), []);

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
    onClose();
    onSaved();
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
        <SimpleSelect value={String(month)} onChange={handleMonthChange} label="Tháng" options={monthOptions} />
        <SimpleSelect value={String(year)} onChange={handleYearChange} label="Năm" options={yearOptions} />
      </form>
    </UnifiedModal>
  );
}
