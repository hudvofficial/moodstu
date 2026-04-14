"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import DatePicker from "@/components/ui/date-picker";
import { SimpleSelect } from "@/components/ui/simple-select";

interface SelectOption {
  value: string;
  label: string;
}

interface ReceiptFormState {
  receipt_date: string;
  receipt_type: string;
  payment_type: string;
  contract_id: string;
  category_id: string;
  receipt_amount: number;
}

interface ReceiptFormFieldsProps {
  form: ReceiptFormState;
  isSale: boolean;
  isContractReceipt: boolean;
  receiptTypeOptions: SelectOption[];
  paymentTypeOptions: SelectOption[];
  categoryOptions: SelectOption[];
  contractOptions: SelectOption[];
  onChangeDate: (value: string) => void;
  onChangeType: (value: string) => void;
  onChangePayment: (value: string) => void;
  onChangeCategory: (value: string) => void;
  onChangeContract: (value: string) => void;
  onChangeAmount: (value: number) => void;
}

export function ReceiptFormFields({
  form,
  isSale,
  isContractReceipt,
  receiptTypeOptions,
  paymentTypeOptions,
  categoryOptions,
  contractOptions,
  onChangeDate,
  onChangeType,
  onChangePayment,
  onChangeCategory,
  onChangeContract,
  onChangeAmount,
}: ReceiptFormFieldsProps) {
  return (
    <div className="form-grid-2col">
      <DatePicker label="Ngày thu" value={form.receipt_date} onChange={onChangeDate} required />
      <SimpleSelect
        label="Loại phiếu"
        value={form.receipt_type}
        onChange={onChangeType}
        options={receiptTypeOptions}
      />
      <SimpleSelect
        label="Phương thức"
        value={form.payment_type}
        onChange={onChangePayment}
        options={paymentTypeOptions}
      />
      {!isSale && !isContractReceipt && (
        <SimpleSelect
          label="Danh mục"
          value={form.category_id}
          onChange={onChangeCategory}
          options={categoryOptions}
          placeholder="Chọn danh mục thu"
        />
      )}
      {isContractReceipt && (
        <SimpleSelect
          label="Hợp đồng"
          value={form.contract_id || "none"}
          onChange={onChangeContract}
          options={contractOptions}
        />
      )}
      <CurrencyInput
        label="Số tiền thu"
        value={form.receipt_amount}
        onChange={onChangeAmount}
        required
        disabled={isSale}
        className={isSale ? "opacity-70 pointer-events-none" : ""}
      />
    </div>
  );
}
