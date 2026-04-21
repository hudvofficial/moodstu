"use client";

import { Landmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { BankInfo } from "@/types/settings";

interface StudioBankSectionProps {
  bankInfo: BankInfo;
  setBankInfo: (value: BankInfo) => void;
}

export default function StudioBankSection({
  bankInfo,
  setBankInfo,
}: StudioBankSectionProps) {
  const updateField = (key: keyof BankInfo, value: string) => {
    setBankInfo({ ...bankInfo, [key]: value });
  };

  return (
    <section className="card-base p-4 lg:p-6">
      <h3 className="section-heading mb-4">
        <Landmark className="w-4 h-4 inline-block mr-1.5 align-middle" />
        Thông tin ngân hàng
      </h3>

      <div className="space-y-3">
        <div className="form-grid-2col">
          <Input
            id="bank-name"
            label="Ngân hàng"
            value={bankInfo.bank_name || ""}
            onChange={(event) => updateField("bank_name", event.target.value)}
            placeholder="Vietcombank"
          />
          <Input
            id="bank-branch"
            label="Chi nhánh"
            value={bankInfo.branch || ""}
            onChange={(event) => updateField("branch", event.target.value)}
            placeholder="CN Quận 1"
          />
        </div>
        <div className="form-grid-2col">
          <Input
            id="bank-account"
            label="Số tài khoản"
            value={bankInfo.account_number || ""}
            onChange={(event) => updateField("account_number", event.target.value)}
            placeholder="0123456789"
          />
          <Input
            id="bank-holder"
            label="Chủ tài khoản"
            value={bankInfo.account_name || ""}
            onChange={(event) => updateField("account_name", event.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </div>
        <div className="form-grid-2col">
          <Input
            id="bank-bin"
            label="Mã BIN ngân hàng"
            value={bankInfo.bank_bin || ""}
            onChange={(event) => updateField("bank_bin", event.target.value)}
            placeholder="970436"
          />
          <Input
            id="bank-qr-url"
            label="URL QR tĩnh"
            value={bankInfo.qr_code_url || ""}
            onChange={(event) => updateField("qr_code_url", event.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
    </section>
  );
}
