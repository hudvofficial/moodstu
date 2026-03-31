"use client";

import { memo } from "react";
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

// ═══════════════════════════════════════════
// ServicePriceSection — Prices, Unit, Status, Fulfillment
// Part of: ServiceForm composition pattern
// @see Phase 1c / Task 4
// ═══════════════════════════════════════════

interface Props {
  formData: ServiceFormData;
  errors: Partial<Record<keyof ServiceFormData, string>>;
  onChange: <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) => void;
}

function ServicePriceSectionInner({ formData, errors, onChange }: Props) {
  return (
    <div className="card-base rounded-soft-2xl p-4 lg:p-6 space-y-4">
      <h3 className="text-label text-primary flex items-center gap-2">
        💰 Giá & phân loại
      </h3>

      {/* Prices — 2 cols on desktop, stacked on mobile */}
      <div className="form-grid-2col">
        {/* Selling Price */}
        <CurrencyInput
          label="Giá bán *"
          value={formData.selling_price || 0}
          onChange={(v: number) => onChange("selling_price", v)}
          error={errors.selling_price}
          className="text-lg text-primary"
        />

        {/* Cost Price */}
        <CurrencyInput
          label="Giá vốn"
          value={formData.cost_price || 0}
          onChange={(v: number) => onChange("cost_price", v)}
          error={errors.cost_price}
        />
      </div>

      {/* Unit + Status (2 cols) */}
      <div className="form-grid-2col">
        <SelectForm
          label="Đơn vị tính"
          value={formData.unit}
          onChange={(v: string) => onChange("unit", v as ServiceUnit)}
          options={SERVICE_UNITS.map((u) => ({
            value: u,
            label: SERVICE_UNIT_LABELS[u as ServiceUnit],
          }))}
        />

        <SelectForm
          label="Trạng thái"
          value={formData.status}
          onChange={(v: string) => onChange("status", v as ServiceStatus)}
          options={SERVICE_STATUSES.map((s) => ({
            value: s,
            label: SERVICE_STATUS_LABELS[s as ServiceStatus],
          }))}
        />
      </div>

      {/* Fulfillment Type */}
      <div className="space-y-1 min-w-0 w-full">
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
