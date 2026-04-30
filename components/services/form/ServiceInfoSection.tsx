"use client";

import { memo } from "react";
import { ClipboardList, Settings } from "lucide-react";
import type { ServiceFormData } from "./hooks/useServiceForm";
import type { ServiceCategory } from "@/types/service";
import { SERVICE_TYPE_LABELS, SERVICE_TYPES } from "@/types/service-constants";
import type { ServiceType } from "@/types/service-constants";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { Button } from "@/components/ui/button";

interface Props {
  formData: ServiceFormData;
  errors: Partial<Record<keyof ServiceFormData | "bundle_items", string>>;
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
    <div className="card-base rounded-soft-2xl p-4 lg:p-6 space-y-4">
      <h3 className="text-label text-primary flex items-center gap-2">
        <ClipboardList className="w-4 h-4" />
        Thông tin dịch vụ
      </h3>

      <div className="space-y-1 min-w-0 w-full">
        <label className="label-base">
          Tên dịch vụ <span className="text-error">*</span>
        </label>
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="VD: Gói chụp Pre-wedding Legacy..."
          error={errors.name}
        />
      </div>

      <div className="form-grid-2col">
        <Input
          label="Mã dịch vụ"
          type="text"
          value={formData.service_code}
          onChange={(e) => onChange("service_code", e.target.value)}
          placeholder="SV-XXXX (tự động)"
          className="font-mono text-text-muted"
          error={errors.service_code}
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

      <div className="space-y-1 min-w-0 w-full">
        <div className="flex items-center justify-between mb-1 gap-3">
          <label className="label-base mb-0">Danh mục</label>
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenCategoryManager}
            className="h-auto p-0 flex items-center gap-1 text-caption text-primary hover:text-primary/80 hover:bg-transparent"
            aria-label="Quản lý danh mục dịch vụ"
          >
            <Settings className="w-3 h-3" />
            Quản lý DM
          </Button>
        </div>
        <SelectForm
          value={formData.category_id}
          onChange={(v: string) => onChange("category_id", v)}
          options={categories.map((cat) => ({
            value: cat.id,
            label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name,
          }))}
          placeholder={categories.length > 0 ? "Chọn danh mục" : "Chưa có danh mục"}
          disabled={categories.length === 0}
        />
        {categories.length === 0 && (
          <p className="text-caption text-text-muted">
            Chưa có danh mục. Dùng nút Quản lý DM để tạo danh mục đầu tiên.
          </p>
        )}
      </div>

      <Input
        label="Link ảnh (tùy chọn)"
        type="text"
        value={formData.image_url}
        onChange={(e) => onChange("image_url", e.target.value)}
        placeholder="https://..."
        error={errors.image_url}
      />
    </div>
  );
}

export default memo(ServiceInfoSectionInner);
