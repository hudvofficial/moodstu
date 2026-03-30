"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useServiceForm } from "./hooks/useServiceForm";
import ServiceInfoSection from "./ServiceInfoSection";
import ServicePriceSection from "./ServicePriceSection";
import ServiceContentEditor from "./ServiceContentEditor";
import { CategoryManagerModal } from "../category-manager-modal";
import QuotePreview from "../quote/quote-preview";
import ServiceBundleSection from "./ServiceBundleSection";
import type { ServiceRecord, ServiceCategory } from "@/types/service";
import type { BundleItem } from "@/lib/logic/bundle-calculator";

// ═══════════════════════════════════════════
// ServiceForm — Form Orchestrator (< 200 lines)
//
// Composition: useServiceForm hook + 3 sections
// Mode: create (no initialData) / edit (with initialData)
//
// @see Phase 1c / Task 2
// ═══════════════════════════════════════════

interface Props {
  initialData?: ServiceRecord | null;
  initialBundleItems?: BundleItem[];
  preFetchedCategories: ServiceCategory[];
}

export default function ServiceForm({
  initialData,
  initialBundleItems,
  preFetchedCategories,
}: Props) {
  const router = useRouter();

  // ── Form hook ──
  const {
    formData,
    errors,
    isSubmitting,
    isEditMode,
    handleChange,
    handleSubmit,
    handleDelete,
    bundleItems,
    setBundleItems,
  } = useServiceForm({ initialData, initialBundleItems });

  // ── Local UI state ──
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // ── Memoized description change handler ──
  const handleDescriptionChange = useCallback(
    (value: string) => handleChange("description", value),
    [handleChange],
  );

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  // ── Sync Action ──
  const handleCategoryCreated = useCallback(
    (newCategory: ServiceCategory) => {
      handleChange("category_id", newCategory.id);
    },
    [handleChange],
  );

  return (
    <>
      <div className="max-w-6xl mx-auto pb-32 lg:pb-12 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        <form
          onSubmit={onFormSubmit}
          className="space-y-4 lg:space-y-6 lg:col-span-7 xl:col-span-8"
        >
          {/* 1. Info Section */}
        <ServiceInfoSection
          formData={formData}
          errors={errors}
          categories={preFetchedCategories}
          onChange={handleChange}
          onOpenCategoryManager={() => setShowCategoryManager(true)}
        />

        {/* 2. Price Section */}
        <ServicePriceSection
          formData={formData}
          errors={errors}
          onChange={handleChange}
        />

        {/* 3. Bundle Section (Only if fulfillment_type === "bundle") */}
        {formData.fulfillment_type === "bundle" && (
          <ServiceBundleSection
            bundleItems={bundleItems}
            setBundleItems={setBundleItems}
          />
        )}

        {/* 4. Content Editor (Description) */}
        <ServiceContentEditor
          value={formData.description}
          onChange={handleDescriptionChange}
        />

          {/* ── Mobile Save Buttons (Inline bottom of form stack) ── */}
          <div className="lg:hidden flex flex-col gap-3 mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditMode ? "Lưu thay đổi" : "Tạo dịch vụ mới"}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này?")) handleDelete();
                }}
                disabled={isSubmitting}
                className="btn-ghost w-full text-danger"
              >
                Xóa dịch vụ
              </button>
            )}
          </div>
        </form>

        {/* ── Desktop Sidebar: Quote Preview + Save Buttons ── */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 sticky top-6 flex-col gap-6">
          {/* Live Preview */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest pl-1">
              Bản xem trước báo giá
            </h3>
            <QuotePreview
              serviceName={formData.name || ""}
              sellingPrice={formData.selling_price || 0}
              description={formData.description || ""}
              unit={formData.unit || ""}
            />
          </div>

          {/* Desktop Save Button */}
          <div className="flex flex-col gap-3 bg-bg-card p-5 rounded-soft-2xl border border-border">
            <button
              onClick={onFormSubmit}
              type="button"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditMode ? "Lưu thay đổi" : "Tạo dịch vụ mới"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary w-full"
            >
              Quay về
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này? Hành động này không thể hoàn tác.")) {
                    handleDelete();
                  }
                }}
                disabled={isSubmitting}
                className="btn-ghost w-full text-danger mt-2"
              >
                Xóa vĩnh viễn dịch vụ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky Save Bar ── */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-bg-card border-t border-border px-4 py-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={isSubmitting}
          className="btn-primary flex-1"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEditMode ? "Lưu" : "Tạo mới"}
        </button>
      </div>

      {/* ── Category Manager Modal ── */}
      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={preFetchedCategories}
        onCategoryCreated={handleCategoryCreated}
      />
    </>
  );
}
