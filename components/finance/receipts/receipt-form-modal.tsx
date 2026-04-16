"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { createReceipt, createSaleReceipt, updateReceipt } from "@/app/actions/receipt-actions";
import type { SaleItem } from "@/app/actions/receipt-actions";
import { formatVnd } from "@/components/finance/finance-format";
import { ReceiptFormFields } from "@/components/finance/receipts/receipt-form-fields";
import { ReceiptFormSaleSection } from "@/components/finance/receipts/receipt-form-sale-section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import type { ActionResult, FinanceCategory, FinanceContractOption } from "@/types/finance-operations";
interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: FinanceCategory[];
  contracts: FinanceContractOption[];
  initialData?: {
    id: string;
    receipt_date: string;
    receipt_type: string;
    payment_type: string;
    contract_id?: string | null;
    category_id?: string | null;
    receipt_amount: number;
    notes?: string | null;
    updated_at?: string | null;
  } | null;
}

const RECEIPT_TYPE_OPTIONS = [
  { value: "other_income", label: "Thu khác" }, { value: "contract_payment", label: "Thu hợp đồng" },
  { value: "contract_deposit", label: "Cọc hợp đồng" }, { value: "sale_receipt", label: "Bán vật tư" },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: "tien_mat", label: "Tiền mặt" },
  { value: "chuyen_khoan", label: "Chuyển khoản" },
];

const today = () => new Date().toISOString().split("T")[0];

function assertActionSuccess<T>(result: ActionResult<T>) {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function emptyForm() {
  return {
    receipt_date: today(),
    receipt_type: "other_income",
    payment_type: "tien_mat",
    contract_id: "",
    category_id: "",
    receipt_amount: 0,
    notes: "",
  };
}

export function ReceiptFormModal({
  isOpen,
  onClose,
  onSaved,
  categories,
  contracts,
  initialData,
}: ReceiptFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const isSale = form.receipt_type === "sale_receipt";
  const isContractReceipt = ["contract_payment", "contract_deposit"].includes(form.receipt_type);

  useEffect(() => {
    if (!isOpen) return;

    // Normalize legacy system values that might be in DB
    let rt = initialData?.receipt_type || "other_income";
    if (rt === "Thanh toán hợp đồng" || rt === "Hợp đồng") rt = "contract_payment";
    if (rt === "Cọc hợp đồng") rt = "contract_deposit";
    if (rt === "Thu nhập khác" || rt === "Thu khác" || rt === "Khác") rt = "other_income";
    if (rt === "Bán vật tư" || rt === "Bán lẻ") rt = "sale_receipt";

    let pt = initialData?.payment_type || "tien_mat";
    if (pt === "Tiền mặt") pt = "tien_mat";
    if (pt === "Chuyển khoản") pt = "chuyen_khoan";
    if (pt === "Quẹt thẻ" || pt === "card") pt = "chuyen_khoan"; // alias card to chuyen_khoan

    setForm(initialData ? {
      receipt_date: initialData.receipt_date || today(),
      receipt_type: rt,
      payment_type: pt,
      contract_id: initialData.contract_id || "",
      category_id: initialData.category_id || "",
      receipt_amount: initialData.receipt_amount || 0,
      notes: initialData.notes || "",
    } : emptyForm());
    setSaleItems([]);
  }, [isOpen, initialData]);

  const categoryOptions = useMemo(
    () => categories.filter((item) => item.type === "thu").map((item) => ({ value: item.id, label: item.name })),
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
  const paymentTypeOptions = PAYMENT_TYPE_OPTIONS;

  const handleChangeDate = useCallback((value: string) => setForm((curr) => ({ ...curr, receipt_date: value })), []);
  const handleChangePayment = useCallback((value: string) => setForm((curr) => ({ ...curr, payment_type: value })), []);
  const handleChangeCategory = useCallback((value: string) => setForm((curr) => ({ ...curr, category_id: value })), []);
  const handleChangeAmount = useCallback((value: number) => setForm((curr) => ({ ...curr, receipt_amount: value })), []);
  const handleChangeNotes = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm((curr) => ({ ...curr, notes: event.target.value }));
  }, []);
  const handleChangeContract = useCallback((value: string) => {
    setForm((curr) => ({ ...curr, contract_id: value === "none" ? "" : value }));
  }, []);
  const handleChangeType = useCallback((value: string) => {
    const nextIsContract = value === "contract_payment" || value === "contract_deposit";
    setForm((curr) => ({
      ...curr,
      receipt_type: value,
      contract_id: nextIsContract ? curr.contract_id : "",
      payment_type: nextIsContract && curr.payment_type === "card" ? "chuyen_khoan" : curr.payment_type,
      category_id: nextIsContract ? "" : curr.category_id,
    }));
    if (value !== "sale_receipt") setSaleItems([]);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const category = categories.find((item) => item.id === form.category_id);

    try {
      if (isContractReceipt && !form.contract_id) {
        throw new Error("Vui lòng chọn hợp đồng cho phiếu thu hợp đồng.");
      }

      if (initialData?.id) {
        assertActionSuccess(await updateReceipt({
          id: initialData.id,
          updated_at: initialData.updated_at,
          receipt_date: form.receipt_date,
          receipt_type: form.receipt_type,
          payment_type: form.payment_type,
          contract_id: isContractReceipt ? form.contract_id : null,
          receipt_amount: form.receipt_amount,
          notes: form.notes || null,
          category_id: form.category_id || null,
          category_name: category?.name || null,
        }));
        toast.success("Đã cập nhật phiếu thu.");
      } else if (isSale) {
        if (saleItems.length === 0) throw new Error("Vui lòng chọn ít nhất 1 vật tư.");
        assertActionSuccess(await createSaleReceipt({
          receipt_date: form.receipt_date,
          receipt_type: form.receipt_type,
          payment_type: form.payment_type,
          receipt_amount: form.receipt_amount,
          notes: form.notes || "",
          category_id: form.category_id || "",
          category_name: category?.name || "Bán vật tư",
          sale_items: saleItems,
        }));
        toast.success("Đã tạo phiếu bán vật tư.");
      } else {
        assertActionSuccess(await createReceipt({
          receipt_date: form.receipt_date,
          receipt_type: form.receipt_type,
          payment_type: form.payment_type,
          contract_id: isContractReceipt ? form.contract_id : null,
          contract_code: isContractReceipt ? selectedContract?.contract_code || null : null,
          receipt_amount: form.receipt_amount,
          previous_paid: selectedContract?.paid_amount || 0,
          total_amount: selectedContract?.total_amount || 0,
          notes: form.notes || null,
          category_id: form.category_id || null,
          category_name: category?.name || null,
        }));
        toast.success("Đã tạo phiếu thu.");
      }

      setSaleItems([]);
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Cập nhật phiếu thu" : "Thêm phiếu thu"}
      description="Ghi nhận khoản thu và tự chặn nếu kỳ đã khóa."
      size="2xl"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="receipt-form" disabled={saving}>
            {saving ? "Đang lưu" : initialData ? "Cập nhật phiếu thu" : "Lưu phiếu thu"}
          </Button>
        </div>
      }
    >
      <form id="receipt-form" onSubmit={submit} className="space-y-4">
        <ReceiptFormFields
          form={form}
          isSale={isSale}
          isContractReceipt={isContractReceipt}
          receiptTypeOptions={RECEIPT_TYPE_OPTIONS}
          paymentTypeOptions={paymentTypeOptions}
          categoryOptions={categoryOptions}
          contractOptions={contractOptions}
          onChangeDate={handleChangeDate}
          onChangeType={handleChangeType}
          onChangePayment={handleChangePayment}
          onChangeCategory={handleChangeCategory}
          onChangeContract={handleChangeContract}
          onChangeAmount={handleChangeAmount}
        />

        <ReceiptFormSaleSection
          isSale={isSale}
          saleItems={saleItems}
          onSaleItemsChange={setSaleItems}
          onTotalChange={handleChangeAmount}
        />

        {selectedContract && isContractReceipt && (
          <div className="card-base p-3 text-body-sm">
            <div className="flex justify-between gap-3">
              <span className="text-text-secondary">Còn phải thu</span>
              <span className="tabular-nums font-bold">{formatVnd(selectedContract.remaining_amount)}</span>
            </div>
          </div>
        )}

        <Textarea label="Ghi chú" value={form.notes} onChange={handleChangeNotes} rows={3} />
      </form>
    </UnifiedModal>
  );
}
