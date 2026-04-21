"use client";

import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createInvestment, updateInvestment } from "@/app/actions/investment-actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { getTodayInTimeZone } from "@/lib/studio-date";
import type { InvestmentItem } from "@/types/finance-operations";

interface InvestmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: InvestmentItem | null;
}

const today = () => getTodayInTimeZone();

export function InvestmentFormModal({
  isOpen,
  onClose,
  onSaved,
  item,
}: InvestmentFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: item?.name || "",
    category: item?.category || "",
    serial_number: item?.serial_number || "",
    purchase_date: item?.purchase_date || today(),
    purchase_price: item?.purchase_price || 0,
    linked_revenue: item?.linked_revenue || 0,
    useful_life_months: String(item?.useful_life_months || 36),
    salvage_value: item?.salvage_value || 0,
    location: item?.location || "",
    next_maintenance_date: item?.next_maintenance_date || "",
    notes: "",
  });

  const handleChangeName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((curr) => ({ ...curr, name: e.target.value })),
    [],
  );
  const handleChangeCategory = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((curr) => ({ ...curr, category: e.target.value })),
    [],
  );
  const handleChangeSerialNumber = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((curr) => ({ ...curr, serial_number: e.target.value })),
    [],
  );
  const handleChangePurchaseDate = useCallback(
    (value: string) => setForm((curr) => ({ ...curr, purchase_date: value })),
    [],
  );
  const handleChangePurchasePrice = useCallback(
    (value: number) => setForm((curr) => ({ ...curr, purchase_price: value })),
    [],
  );
  const handleChangeLinkedRevenue = useCallback(
    (value: number) => setForm((curr) => ({ ...curr, linked_revenue: value })),
    [],
  );
  const handleChangeUsefulLife = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((curr) => ({
        ...curr,
        useful_life_months: e.target.value.replace(/\D/g, ""),
      })),
    [],
  );
  const handleChangeSalvageValue = useCallback(
    (value: number) => setForm((curr) => ({ ...curr, salvage_value: value })),
    [],
  );
  const handleChangeLocation = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((curr) => ({ ...curr, location: e.target.value })),
    [],
  );
  const handleChangeMaintenanceDate = useCallback(
    (value: string) =>
      setForm((curr) => ({ ...curr, next_maintenance_date: value })),
    [],
  );
  const handleChangeNotes = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setForm((curr) => ({ ...curr, notes: e.target.value })),
    [],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      serial_number: form.serial_number.trim() || undefined,
      purchase_date: form.purchase_date,
      purchase_price: form.purchase_price,
      linked_revenue: form.linked_revenue > 0 ? form.linked_revenue : undefined,
      useful_life_months: Number(form.useful_life_months) || 36,
      depreciation_method: "straight_line",
      salvage_value: form.salvage_value,
      location: form.location.trim() || undefined,
      next_maintenance_date: form.next_maintenance_date || undefined,
      notes: form.notes.trim() || undefined,
    };

    const result = item
      ? await updateInvestment(item.id, payload, item.updated_at || undefined)
      : await createInvestment(payload);

    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(item ? "Đã cập nhật tài sản." : "Đã tạo tài sản.");
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? "Sửa tài sản" : "Thêm tài sản"}
      size="2xl"
      footer={
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </Button>
          <Button type="submit" form="investment-form" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu tài sản"}
          </Button>
        </div>
      }
    >
      <form id="investment-form" onSubmit={submit} className="investment-form">
        <div className="form-grid-2col">
          <Input
            label="Tên tài sản"
            value={form.name}
            onChange={handleChangeName}
            required
          />
          <Input
            label="Danh mục"
            value={form.category}
            onChange={handleChangeCategory}
            required
          />
          <Input
            label="Số serial"
            value={form.serial_number}
            onChange={handleChangeSerialNumber}
          />
          <DatePicker
            label="Ngày mua"
            value={form.purchase_date}
            onChange={handleChangePurchaseDate}
            required
          />
          <CurrencyInput
            label="Giá mua"
            value={form.purchase_price}
            onChange={handleChangePurchasePrice}
            required
          />
          <CurrencyInput
            label="Doanh thu liên kết"
            value={form.linked_revenue}
            onChange={handleChangeLinkedRevenue}
          />
          <Input
            label="Vòng đời (tháng)"
            value={form.useful_life_months}
            inputMode="numeric"
            onChange={handleChangeUsefulLife}
          />
          <CurrencyInput
            label="Giá trị thu hồi"
            value={form.salvage_value}
            onChange={handleChangeSalvageValue}
          />
          <Input
            label="Vị trí"
            value={form.location}
            onChange={handleChangeLocation}
          />
          <DatePicker
            label="Bảo trì tiếp theo"
            value={form.next_maintenance_date}
            onChange={handleChangeMaintenanceDate}
          />
        </div>
        <Textarea
          label="Ghi chú"
          value={form.notes}
          onChange={handleChangeNotes}
          rows={3}
        />
      </form>
    </UnifiedModal>
  );
}
