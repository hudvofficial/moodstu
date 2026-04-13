"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createReceipt } from "@/app/actions/receipt-actions";
import { formatVnd } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { FinanceCategory, FinanceContractOption } from "@/types/finance-operations";

interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: FinanceCategory[];
  contracts: FinanceContractOption[];
}

const today = () => new Date().toISOString().split("T")[0];

export function ReceiptFormModal({
  isOpen,
  onClose,
  onSaved,
  categories,
  contracts,
}: ReceiptFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    receipt_date: today(),
    receipt_type: "Thu khác",
    payment_type: "tien_mat",
    contract_id: "",
    category_id: "",
    receipt_amount: 0,
    notes: "",
  });

  const categoryOptions = useMemo(
    () => categories.filter((item) => item.type === "Thu").map((item) => ({ value: item.id, label: item.name })),
    [categories],
  );
  const contractOptions = useMemo(
    () => [
      { value: "none", label: "Không gắn hợp đồng" },
      ...contracts.map((item) => ({
        value: item.id,
        label: `${item.contract_code} - ${item.customer_name || "Khách hàng"}`,
      })),
    ],
    [contracts],
  );
  const selectedContract = contracts.find((item) => item.id === form.contract_id);

  const setField = (field: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const category = categories.find((item) => item.id === form.category_id);
    const result = await createReceipt({
      receipt_date: form.receipt_date,
      receipt_type: form.receipt_type,
      payment_type: form.payment_type,
      contract_id: form.contract_id || null,
      contract_code: selectedContract?.contract_code || null,
      receipt_amount: form.receipt_amount,
      previous_paid: selectedContract?.paid_amount || 0,
      total_amount: selectedContract?.total_amount || 0,
      notes: form.notes || null,
      category_id: form.category_id || null,
      category_name: category?.name || null,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã tạo phiếu thu.");
    setForm({
      receipt_date: today(),
      receipt_type: "Thu khác",
      payment_type: "tien_mat",
      contract_id: "",
      category_id: "",
      receipt_amount: 0,
      notes: "",
    });
    onSaved();
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm phiếu thu"
      description="Ghi nhận khoản thu và tự chặn nếu kỳ đã khóa."
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="receipt-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu phiếu thu"}
          </Button>
        </div>
      }
    >
      <form id="receipt-form" onSubmit={submit} className="space-y-4">
        <div className="form-grid-2col">
          <DatePicker label="Ngày thu" value={form.receipt_date} onChange={(value) => setField("receipt_date", value)} required />
          <SimpleSelect
            label="Loại phiếu"
            value={form.receipt_type}
            onChange={(value) => setField("receipt_type", value)}
            options={[
              { value: "Thu khác", label: "Thu khác" },
              { value: "Thu hợp đồng", label: "Thu hợp đồng" },
              { value: "Bán vật tư", label: "Bán vật tư" },
            ]}
          />
          <SimpleSelect
            label="Phương thức"
            value={form.payment_type}
            onChange={(value) => setField("payment_type", value)}
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
            placeholder="Chọn danh mục thu"
          />
          <SimpleSelect
            label="Hợp đồng"
            value={form.contract_id || "none"}
            onChange={(value) => setField("contract_id", value === "none" ? "" : value)}
            options={contractOptions}
          />
          <CurrencyInput label="Số tiền thu" value={form.receipt_amount} onChange={(value) => setField("receipt_amount", value)} required />
        </div>

        {selectedContract && (
          <div className="card-base p-3 text-body-sm">
            <div className="flex justify-between gap-3">
              <span className="text-text-secondary">Còn phải thu</span>
              <span className="tabular-nums font-bold">{formatVnd(selectedContract.remaining_amount)}</span>
            </div>
          </div>
        )}

        <Textarea label="Ghi chú" value={form.notes} onChange={(event) => setField("notes", event.target.value)} rows={3} />
      </form>
    </UnifiedModal>
  );
}
