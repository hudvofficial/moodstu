"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createService, updateService, deleteService } from "@/app/actions/service-mutations";
import { cacheKeys, revalidateByPrefixes } from "@/lib/swr";
import { generateServiceCode, sectionsToJson, parseContentStructure } from "@/lib/utils/service-utils";
import type { ServiceRecord } from "@/types/service";
import type { ContentSection } from "@/types/service";
import type { BundleItem } from "@/lib/logic/bundle-calculator";
import type { BundleItemInput } from "@/lib/validations/service.schema";

// ═══════════════════════════════════════════
// useServiceForm — V2 Gold Standard
//
// Manages all form state, validation, and submission
// for both create and edit modes.
//
// @see Phase 1c / Task 1
// ═══════════════════════════════════════════

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

export function useServiceForm({ initialData, initialBundleItems }: UseServiceFormOptions = {}) {
  const router = useRouter();
  const isEditMode = !!initialData?.id;

  // ── State ──
  const [formData, setFormData] = useState<ServiceFormData>(() => initFormData(initialData));
  const [bundleItems, setBundleItems] = useState<BundleItem[]>(initialBundleItems || []);
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Content Sections (structured description) ──
  const sections = useMemo<ContentSection[]>(
    () => parseContentStructure(formData.description),
    [formData.description],
  );

  // ── Handlers ──
  const handleChange = useCallback(
    <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      // Clear error for this field
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const handleSectionsChange = useCallback(
    (newSections: ContentSection[]) => {
      const json = sectionsToJson(newSections);
      setFormData((prev) =>
        prev.description === json ? prev : { ...prev, description: json },
      );
    },
    [],
  );

  // ── Client-side Validate ──
  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof ServiceFormData, string>> = {};

    if (!formData.name.trim()) {
      errs.name = "Tên dịch vụ là bắt buộc";
    }
    if (formData.selling_price < 0) {
      errs.selling_price = "Giá bán không hợp lệ";
    }
    if (formData.cost_price < 0) {
      errs.cost_price = "Giá vốn không hợp lệ";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      let result;

      // Prepare bundle items for DB
      const bundleInputs: BundleItemInput[] = bundleItems.map((item, idx) => ({
        child_service_id: item.service_id,
        quantity: item.quantity,
        adjustment_price: 0, // Not explicitly managed in UI yet
        sort_order: idx,
      }));

      if (isEditMode && initialData) {
        // Update mode — unwrap ActionResult
        result = await updateService({
          id: initialData.id,
          updated_at: initialData.updated_at,
          data: {
            name: formData.name.trim(),
            service_code: formData.service_code,
            service_type: formData.service_type,
            category_id: formData.category_id || undefined,
            selling_price: formData.selling_price,
            cost_price: formData.cost_price,
            unit: formData.unit,
            fulfillment_type: formData.fulfillment_type,
            status: formData.status,
            description: formData.description || undefined,
            image_url: formData.image_url || undefined,
          },
        }, bundleInputs);
      } else {
        // Create mode — unwrap ActionResult
        result = await createService({
          name: formData.name.trim(),
          service_code: formData.service_code || undefined,
          service_type: formData.service_type,
          category_id: formData.category_id || undefined,
          selling_price: formData.selling_price,
          cost_price: formData.cost_price,
          unit: formData.unit,
          fulfillment_type: formData.fulfillment_type,
          status: formData.status,
          description: formData.description || undefined,
          image_url: formData.image_url || undefined,
        }, bundleInputs);
      }

      if (!result.success) {
        toast.error(result.error || "Đã có lỗi xảy ra");
        return;
      }

      toast.success(isEditMode ? "Cập nhật dịch vụ thành công" : "Tạo dịch vụ thành công");
      await revalidateByPrefixes([cacheKeys.services(), cacheKeys.categories()]);
      router.push("/services");
    } catch (error: unknown) {
      const e = error as Error;
      toast.error(e.message || "Đã có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, bundleItems, validate, isEditMode, initialData, router]);

  // ── Delete ──
  const handleDelete = useCallback(async () => {
    if (!initialData?.id) return;

    setIsSubmitting(true);

    try {
      const result = await deleteService(initialData.id);

      if (!result.success) {
        toast.error(result.error || "Không thể xóa dịch vụ");
        return;
      }

      toast.success("Đã xóa dịch vụ");
      await revalidateByPrefixes([cacheKeys.services(), cacheKeys.categories()]);
      router.push("/services");
    } catch (error: unknown) {
      const e = error as Error;
      toast.error(e.message || "Không thể xóa dịch vụ");
    } finally {
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
  };
}
