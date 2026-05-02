"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createService, updateService, deleteService } from "@/app/actions/service-mutations";
import { invalidateServiceAfterWrite } from "@/lib/cache-invalidation";
import { generateServiceCode, sectionsToJson, parseContentStructure } from "@/lib/utils/service-utils";
import type { ServiceRecord } from "@/types/service";
import type { ContentSection } from "@/types/service";
import type { BundleItem } from "@/lib/logic/bundle-calculator";
import type { BundleItemInput } from "@/lib/validations/service.schema";

export interface ServiceFormData {
  name: string;
  service_code: string;
  service_type: string;
  category_id: string;
  selling_price: number;
  cost_price: number;
  unit: string;
  fulfillment_type: string;
  status: string;
  description: string;
  image_url: string;
}

interface UseServiceFormOptions {
  initialData?: ServiceRecord | null;
  initialBundleItems?: BundleItem[];
}

type ServiceFormErrors = Partial<
  Record<keyof ServiceFormData | "bundle_items", string>
>;

const EMPTY_FORM: ServiceFormData = {
  name: "",
  service_code: "",
  service_type: "studio",
  category_id: "",
  selling_price: 0,
  cost_price: 0,
  unit: "dich_vu",
  fulfillment_type: "single",
  status: "active",
  description: "",
  image_url: "",
};

function initFormData(record?: ServiceRecord | null): ServiceFormData {
  if (!record) {
    return { ...EMPTY_FORM, service_code: generateServiceCode() };
  }

  return {
    name: record.name || "",
    service_code: record.service_code || "",
    service_type: record.service_type || "studio",
    category_id: record.category_id || "",
    selling_price: Number(record.selling_price) || 0,
    cost_price: Number(record.cost_price) || 0,
    unit: record.unit || "dich_vu",
    fulfillment_type: record.fulfillment_type || "single",
    status: record.status || "active",
    description: record.description || "",
    image_url: record.image_url || "",
  };
}

function isDuplicateCodeError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("service_code") ||
    lower.includes("ma dich vu") ||
    lower.includes("mã dịch vụ") ||
    lower.includes("duplicate") ||
    lower.includes("unique")
  );
}

export function useServiceForm({ initialData, initialBundleItems }: UseServiceFormOptions = {}) {
  const router = useRouter();
  const isEditMode = !!initialData?.id;
  const submitLockRef = useRef(false);

  const [formData, setFormData] = useState<ServiceFormData>(() => initFormData(initialData));
  const [bundleItems, setBundleItems] = useState<BundleItem[]>(initialBundleItems || []);
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sections = useMemo<ContentSection[]>(
    () => parseContentStructure(formData.description),
    [formData.description],
  );

  const handleChange = useCallback(
    <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const clearBundleError = useCallback(() => {
    setErrors((prev) => {
      if (!prev.bundle_items) return prev;
      const next = { ...prev };
      delete next.bundle_items;
      return next;
    });
  }, []);

  const handleSectionsChange = useCallback(
    (newSections: ContentSection[]) => {
      const json = sectionsToJson(newSections);
      setFormData((prev) =>
        prev.description === json ? prev : { ...prev, description: json },
      );
    },
    [],
  );

  const validate = useCallback((): boolean => {
    const errs: ServiceFormErrors = {};

    if (!formData.name.trim()) {
      errs.name = "Tên dịch vụ là bắt buộc";
    }
    if (!Number.isFinite(formData.selling_price) || formData.selling_price < 0) {
      errs.selling_price = "Giá bán không hợp lệ";
    }
    if (!Number.isFinite(formData.cost_price) || formData.cost_price < 0) {
      errs.cost_price = "Giá vốn không hợp lệ";
    }
    if (formData.image_url.trim()) {
      try {
        const url = new URL(formData.image_url.trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          errs.image_url = "Link ảnh phải bắt đầu bằng http hoặc https";
        }
      } catch {
        errs.image_url = "Link ảnh không hợp lệ";
      }
    }
    if (formData.fulfillment_type === "bundle" && bundleItems.length === 0) {
      errs.bundle_items = "Gói/combo cần ít nhất một dịch vụ thành phần";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData, bundleItems.length]);

  const applyActionError = useCallback((message?: string) => {
    const errorMessage = message || "Đã có lỗi xảy ra";

    if (isDuplicateCodeError(errorMessage)) {
      setErrors((prev) => ({
        ...prev,
        service_code: "Mã dịch vụ đã tồn tại, vui lòng đổi mã khác",
      }));
      toast.error("Mã dịch vụ đã tồn tại");
      return;
    }

    const lower = errorMessage.toLowerCase();
    if (lower.includes("bundle") || lower.includes("gói")) {
      setErrors((prev) => ({
        ...prev,
        bundle_items: errorMessage,
      }));
    }

    toast.error(errorMessage);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current) return;
    if (!validate()) return;

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      let result;

      const bundleInputs: BundleItemInput[] = bundleItems.map((item, idx) => ({
        child_service_id: item.service_id,
        quantity: item.quantity,
        adjustment_price: 0,
        sort_order: idx,
      }));

      if (isEditMode && initialData) {
        result = await updateService({
          id: initialData.id,
          updated_at: initialData.updated_at,
          data: {
            name: formData.name.trim(),
            service_code: formData.service_code.trim(),
            service_type: formData.service_type,
            category_id: formData.category_id || undefined,
            selling_price: formData.selling_price,
            cost_price: formData.cost_price,
            unit: formData.unit,
            fulfillment_type: formData.fulfillment_type,
            status: formData.status,
            description: formData.description || undefined,
            image_url: formData.image_url.trim() || undefined,
          },
        }, bundleInputs);
      } else {
        result = await createService({
          name: formData.name.trim(),
          service_code: formData.service_code.trim() || undefined,
          service_type: formData.service_type,
          category_id: formData.category_id || undefined,
          selling_price: formData.selling_price,
          cost_price: formData.cost_price,
          unit: formData.unit,
          fulfillment_type: formData.fulfillment_type,
          status: formData.status,
          description: formData.description || undefined,
          image_url: formData.image_url.trim() || undefined,
        }, bundleInputs);
      }

      if (!result.success) {
        applyActionError(result.error);
        return;
      }

      toast.success(isEditMode ? "Cập nhật dịch vụ thành công" : "Tạo dịch vụ thành công");
      router.push("/services");
      void invalidateServiceAfterWrite(result.data?.id);
    } catch (error: unknown) {
      const e = error as Error;
      applyActionError(e.message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [formData, bundleItems, validate, isEditMode, initialData, router, applyActionError]);

  const handleDelete = useCallback(async () => {
    if (!initialData?.id || submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await deleteService(initialData.id);

      if (!result.success) {
        toast.error(result.error || "Không thể xóa dịch vụ");
        return;
      }

      toast.success("Đã xóa dịch vụ");
      router.push("/services");
      void invalidateServiceAfterWrite(initialData.id);
    } catch (error: unknown) {
      const e = error as Error;
      toast.error(e.message || "Không thể xóa dịch vụ");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [initialData, router]);

  return {
    formData,
    errors,
    isSubmitting,
    isEditMode,
    sections,
    handleChange,
    handleSectionsChange,
    handleSubmit,
    handleDelete,
    bundleItems,
    setBundleItems,
    clearBundleError,
  };
}
