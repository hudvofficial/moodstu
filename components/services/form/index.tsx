"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useServiceForm } from "./hooks/useServiceForm";
import ServiceInfoSection from "./ServiceInfoSection";
import ServicePriceSection from "./ServicePriceSection";
import ServiceContentEditor from "./ServiceContentEditor";
import { CategoryManagerModal } from "../category-manager-modal";
import ServiceBundleSection from "./ServiceBundleSection";
import { FullpageFormShell } from "../../layout/fullpage-form-shell";
import { DesktopSidebarPanel, MobileStickyPanel } from "./SaveActionPanels";
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
    clearBundleError,
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
    e.stopPropagation();
    handleSubmit();
  };

  // ── Sync Action ──
  const handleCategoryCreated = useCallback(
    (newCategory: ServiceCategory) => {
      handleChange("category_id", newCategory.id);
    },
    [handleChange],
  );

  // ── Unified Action Props ──
  const actionProps = {
    isSubmitting,
    isEditMode,
    onCancel: () => router.back(),
    onDelete: handleDelete,
    onSubmit: handleSubmit,
    serviceName: formData.name || "",
    sellingPrice: formData.selling_price || 0,
    description: formData.description || "",
    unit: formData.unit || "",
  };

  return (
    <>
      <FullpageFormShell rightPanel={<DesktopSidebarPanel {...actionProps} />}>
        <form
          onSubmit={onFormSubmit}
          className="space-y-4 lg:space-y-6"
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
              error={errors.bundle_items}
              onBundleChange={clearBundleError}
            />
          )}

          {/* 4. Content Editor (Description) */}
          <ServiceContentEditor
            value={formData.description}
            onChange={handleDescriptionChange}
          />

          {/* ── Mobile Sticky Save Panel ── */}
          <MobileStickyPanel {...actionProps} />
        </form>
      </FullpageFormShell>

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
