"use client";

import { memo } from "react";
import { BadgeDollarSign } from "lucide-react";
import type { ServiceFormData } from "./hooks/useServiceForm";
import {
  SERVICE_UNIT_LABELS,
  SERVICE_UNITS,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUSES,
  FULFILLMENT_TYPE_LABELS,
  FULFILLMENT_TYPES,
} from "@/types/service-constants";
import type { ServiceUnit, ServiceStatus, FulfillmentType } from "@/types/service-constants";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";

interface Props {
  formData: ServiceFormData;
  errors: Partial<Record<keyof ServiceFormData | "bundle_items", string>>;
  onChange: <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) => void;
}

function ServicePriceSectionInner({ formData, errors, onChange }: Props) {
  const isProductUnit = formData.unit === "san_pham";
  const belowCost =
    isProductUnit &&
    formData.selling_price > 0 &&
    formData.cost_price > 0 &&
    formData.selling_price < formData.cost_price;

  return (
    <div className="card-base rounded-soft-2xl p-3.5 sm:p-4 lg:p-6 space-y-3.5 lg:space-y-4">
      <h3 className="text-label text-primary flex items-center gap-2">
        <BadgeDollarSign className="w-4 h-4" />
        Giá bán & phân loại
      </h3>

      <div className="form-grid-2col">
        <CurrencyInput
          label="Giá bán *"
          value={formData.selling_price || 0}
          onChange={(v: number) => onChange("selling_price", v)}
          error={errors.selling_price}
          className="h-11 text-primary"
        />

        <SelectForm
          label="Đơn vị tính"
          value={formData.unit}
          onChange={(v: string) => onChange("unit", v as ServiceUnit)}
          options={SERVICE_UNITS.map((u) => ({
            value: u,
            label: SERVICE_UNIT_LABELS[u as ServiceUnit],
          }))}
        />
      </div>

      {isProductUnit && (
        <div className="form-grid-2col">
          <CurrencyInput
            label="Giá vốn sản phẩm"
            value={formData.cost_price || 0}
            onChange={(v: number) => onChange("cost_price", v)}
            error={errors.cost_price}
            className="h-11"
          />
          <div className="hidden lg:block" />
        </div>
      )}

      {belowCost && (
        <p className="warning-text">
          Giá bán đang thấp hơn giá vốn sản phẩm. Vẫn có thể lưu nếu đây là giá khuyến mãi.
        </p>
      )}

      <div className="form-grid-2col">
        <SelectForm
          label="Trạng thái"
          value={formData.status}
          onChange={(v: string) => onChange("status", v as ServiceStatus)}
          options={SERVICE_STATUSES.map((s) => ({
            value: s,
            label: SERVICE_STATUS_LABELS[s as ServiceStatus],
          }))}
        />

        <SelectForm
          label="Hình thức cung cấp"
          value={formData.fulfillment_type}
          onChange={(v: string) => onChange("fulfillment_type", v as FulfillmentType)}
          options={FULFILLMENT_TYPES.map((ft) => ({
            value: ft,
            label: FULFILLMENT_TYPE_LABELS[ft as FulfillmentType],
          }))}
        />
      </div>
    </div>
  );
}

export default memo(ServicePriceSectionInner);
