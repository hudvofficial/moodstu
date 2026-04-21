"use client";

import type { ContractFormData } from "@/types/contract-form";
import { SERVICE_TYPE_GROUPS, SERVICE_TYPE_LABELS } from "@/types/contract-form";
import type { ServiceType } from "@/types/contract";
import DatePicker from "@/components/ui/date-picker";
import { GroupedSelect } from "@/components/ui/grouped-select";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Fingerprint } from "lucide-react";

// ═══════════════════════════════════════════
// ContractInfoSection — Top fields of the contract form
// Service type, dates, transaction type, assigned_to
// ═══════════════════════════════════════════

const TRANSACTION_TYPES = [
  { value: "hop_dong", label: "Hợp đồng" },
  { value: "hoa_don", label: "Hóa đơn" },
];

// Transform SERVICE_TYPE_GROUPS → GroupedSelect format (computed once)
const SERVICE_TYPE_SELECT_GROUPS = SERVICE_TYPE_GROUPS.map((group) => ({
  groupName: group.groupName,
  color: group.color,
  options: group.types.map((type) => ({
    value: type,
    label: SERVICE_TYPE_LABELS[type],
  })),
}));

interface Props {
  formData: ContractFormData;
  updateField: <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => void;
  showDeliveryDate: boolean;
  badgeCode?: string;
}

export function ContractInfoSection({ formData, updateField, showDeliveryDate, badgeCode }: Props) {
  return (
    <section className="card-base border-l-4 border-accent p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="form-section-heading">
          1. Thông tin hợp đồng
        </h3>
        {badgeCode && (
          <div className="flex items-center gap-1.5 text-interactive text-caption">
            <span className="text-text-muted">Mã HĐ</span>
            <Fingerprint className="h-3.5 w-3.5" />
            <span className="font-bold tracking-wider">{badgeCode}</span>
          </div>
        )}
      </div>

      {/* All fields: 2 cols mobile, 3 cols desktop */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SimpleSelect
          label="Loại giao dịch"
          value={formData.transaction_type}
          onChange={(v) => updateField("transaction_type", v as "hop_dong" | "hoa_don")}
          options={TRANSACTION_TYPES}
        />

        <GroupedSelect
          value={formData.service_type}
          onChange={(val) => updateField("service_type", val as ServiceType)}
          groups={SERVICE_TYPE_SELECT_GROUPS}
          label="Loại dịch vụ *"
        />

        <DatePicker
          value={formData.contract_date}
          onChange={(v) => updateField("contract_date", v)}
          label="Ngày hợp đồng"
          placeholder="Chọn ngày"
        />

        <DatePicker
          value={formData.work_date}
          onChange={(v) => updateField("work_date", v)}
          label="Ngày chụp / làm việc"
          placeholder="Chọn ngày"
        />

        {showDeliveryDate && (
          <DatePicker
            value={formData.delivery_date}
            onChange={(v) => updateField("delivery_date", v)}
            label="Ngày giao sản phẩm"
            placeholder="Chọn ngày"
          />
        )}

        <Field label="Nhân viên phụ trách">
          <Input unstyled
            type="text"
            value={formData.assigned_to}
            onChange={(e) => updateField("assigned_to", e.target.value)}
            placeholder="Tên nhân viên..."
            className="input-base placeholder:text-text-muted"
          />
        </Field>
      </div>



      {/* Description */}
      <Field label="Mô tả">
        <Textarea unstyled
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Mô tả gói dịch vụ, yêu cầu đặc biệt..."
          rows={3}
          className="input-base resize-none"
        />
      </Field>
    </section>
  );
}

// ── Field wrapper ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-base">{label}</label>
      {children}
    </div>
  );
}
