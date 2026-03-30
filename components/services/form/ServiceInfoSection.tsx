"use client";

import { memo } from "react";
import { Settings } from "lucide-react";
import type { ServiceFormData } from "./hooks/useServiceForm";
import type { ServiceCategory } from "@/types/service";
import { SERVICE_TYPE_LABELS, SERVICE_TYPES } from "@/types/service-constants";
import type { ServiceType } from "@/types/service-constants";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";

// ═══════════════════════════════════════════
// ServiceInfoSection — Name, Code, Type, Category
// Part of: ServiceForm composition pattern
// @see Phase 1c / Task 3
// ═══════════════════════════════════════════

interface Props {
  formData: ServiceFormData;
  errors: Partial<Record<keyof ServiceFormData, string>>;
  categories: ServiceCategory[];
  onChange: <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) => void;
  onOpenCategoryManager: () => void;
}

function ServiceInfoSectionInner({
  formData,
  errors,
  categories,
  onChange,
  onOpenCategoryManager,
}: Props) {
  return (
    <div className="card-base p-4 lg:p-6 space-y-4">
      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
        📋 Thông tin dịch vụ
      </h3>

      {/* Service Name */}
      <div className="space-y-1 min-w-0 w-full">
        <label className="label-base">
          Tên dịch vụ <span className="text-danger">*</span>
        </label>
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="VD: Gói chụp Pre-wedding Legacy..."
          error={errors.name}
        />
      </div>

      {/* Code + Type (2 columns) */}
      <div className="form-grid-2col">
        <Input
          label="Mã dịch vụ"
          type="text"
          value={formData.service_code}
          onChange={(e) => onChange("service_code", e.target.value)}
          placeholder="SV-XXXX (tự động)"
          className="font-mono text-text-muted"
        />
        <SelectForm
          label="Loại dịch vụ"
          value={formData.service_type}
          onChange={(v: string) => onChange("service_type", v as ServiceType)}
          options={SERVICE_TYPES.map((type) => ({
            value: type,
            label: SERVICE_TYPE_LABELS[type as ServiceType],
          }))}
        />
      </div>

      {/* Category */}
      <div className="space-y-1 min-w-0 w-full">
        <div className="flex items-center justify-between mb-1">
          <label className="label-base mb-0">Danh mục</label>
          <button
            type="button"
            onClick={onOpenCategoryManager}
            className="flex items-center gap-1 text-caption text-primary hover:text-primary/80 transition-colors"
          >
            <Settings className="w-3 h-3" />
            Quản lý DM
          </button>
        </div>
        <SelectForm
          value={formData.category_id}
          onChange={(v: string) => onChange("category_id", v)}
          options={categories.map((cat) => ({
            value: cat.id,
            label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name,
          }))}
          placeholder="— Chọn danh mục —"
        />
      </div>

      {/* Image URL (optional) */}
      <Input
        label="Link ảnh (tùy chọn)"
        type="text"
        value={formData.image_url}
        onChange={(e) => onChange("image_url", e.target.value)}
        placeholder="https://..."
      />
    </div>
  );
}

export default memo(ServiceInfoSectionInner);
