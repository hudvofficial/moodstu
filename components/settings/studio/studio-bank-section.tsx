"use client";

import { Input } from "@/components/ui/input";
import { Landmark } from "lucide-react";
import type { BankInfo } from "@/types/settings";

/* ═══════════════════════════════════════════
   Studio Bank Section — Bank Info JSONB fields
   Sub-component of StudioInfoForm
   ═══════════════════════════════════════════ */

interface StudioBankSectionProps {
  bankInfo: BankInfo;
  setBankInfo: (v: BankInfo) => void;
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
            onChange={(e) => updateField("bank_name", e.target.value)}
            placeholder="Vietcombank"
          />
          <Input
            id="bank-branch"
            label="Chi nhánh"
            value={bankInfo.branch || ""}
            onChange={(e) => updateField("branch", e.target.value)}
            placeholder="CN Quận 1"
          />
        </div>
        <div className="form-grid-2col">
          <Input
            id="bank-account"
            label="Số tài khoản"
            value={bankInfo.account_number || ""}
            onChange={(e) => updateField("account_number", e.target.value)}
            placeholder="0123456789"
          />
          <Input
            id="bank-holder"
            label="Chủ tài khoản"
            value={bankInfo.account_name || ""}
            onChange={(e) => updateField("account_name", e.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </div>
        <div className="form-grid-2col">
          <Input
            id="bank-bin"
            label="Mã BIN ngân hàng"
            value={bankInfo.bank_bin || ""}
            onChange={(e) => updateField("bank_bin", e.target.value)}
            placeholder="970436"
          />
          <Input
            id="bank-qr-url"
            label="URL QR tĩnh"
            value={bankInfo.qr_code_url || ""}
            onChange={(e) => updateField("qr_code_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
    </section>
  );
}
