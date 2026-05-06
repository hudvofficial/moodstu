"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useContractForm } from "./hooks/useContractForm";
import { ContractInfoSection } from "./ContractInfoSection";
import { ContractCustomerSection } from "./ContractCustomerSection";
import { ContractItemsSection } from "./ContractItemsSection";
import { ContractFinancialSummary } from "./ContractFinancialSummary";
import { ContractPaymentSection } from "./ContractPaymentSection";
import { FormActions } from "./FormActions";
import { ItemModal } from "./modals/ItemModal";
import { CreateServiceModal } from "./modals/CreateServiceModal";
import { CustomerFormModal } from "./modals/CustomerFormModal";
import { prefetchCatalogItems } from "./modals/catalog-cache";
import { FullpageFormShell } from "@/components/layout/fullpage-form-shell";
import { useSetHeaderSlots } from "@/contexts/header-slots-context";
import { Loader2, ArrowLeft } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ContractFormMode } from "@/types/contract-form";
import type { ItemType } from "@/types/contract";

// ═══════════════════════════════════════════
// ContractForm — Main form shell
// Layout: FullpageFormShell (two-column on desktop)
//   LEFT  → Title + S1 + S2 + S3 + S6
//   RIGHT → S4 + S5 + Actions (sticky panel)
//   MOBILE → single column + fixed footer
// ═══════════════════════════════════════════

interface Props {
  mode: ContractFormMode;
  contractId?: string;
}

type QuickCreateItemType = Exclude<ItemType, "trang_phuc" | "phat_sinh">;

export default function ContractForm({ mode, contractId }: Props) {
  const form = useContractForm({ mode, contractId });
  const [showCreateService, setShowCreateService] = useState(false);
  const [createServiceItemType, setCreateServiceItemType] = useState<QuickCreateItemType>("dich_vu");

  // ── Unified badge code (preview for create, actual for edit) ──
  const badgeCode = mode === "create" ? form.previewCode : form.formData.contract_code;

  // ══════════════════════════════
  // Header slots (system header via HeaderSlotsContext)
  // ALL hooks MUST be called before any early return
  // ══════════════════════════════
  const setHeaderSlots = useSetHeaderSlots();
  useEffect(() => {
    setHeaderSlots({
      leftSlot: (
        <Link href="/contracts" className="lg:hidden btn-icon shrink-0">
          <ArrowLeft size={20} />
        </Link>
      ),
      titleOverride: mode === "create" ? "Tạo hợp đồng mới" : "Sửa hợp đồng",
      hideSearch: true,
    });
    return () => setHeaderSlots({});
  }, [setHeaderSlots, mode]);

  // Load data for edit mode
  useEffect(() => {
    if (mode === "edit" && contractId) {
      form.loadContractForEdit(contractId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, contractId]);

  useEffect(() => {
    if (mode !== "create") return;

    const warm = () => prefetchCatalogItems("dich_vu");
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(warm, { timeout: 1500 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = globalThis.setTimeout(warm, 500);
    return () => globalThis.clearTimeout(timeoutId);
  }, [mode]);

  // ── Loading state ──
  if (form.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
      </div>
    );
  }

  // ── Load error state ──
  if (form.errors.load) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-2xl rounded-radius-md bg-error/10 p-6 text-center">
          <p className="text-body text-error">{form.errors.load}</p>
          <Button unstyled
            onClick={() => form.handleCancel()}
            className="btn btn-interactive mt-4"
          >
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  /** Right panel: S4 + S5 + Actions (desktop sticky) */
  const rightPanel = (
    <>
      {/* Section 4: Financial Summary */}
      <ContractFinancialSummary
        financials={form.financials}
        isEditMode={mode === "edit"}
      />

      {/* Section 5: Payment — CREATE only */}
      {form.shouldShowPaymentSection && (
        <ContractPaymentSection financials={form.financials} />
      )}

      {/* Actions — panel variant (desktop right column) */}
      <FormActions
        variant="panel"
        isSubmitting={form.isSubmitting}
        isEditMode={mode === "edit"}
        onSubmit={form.handleSubmit}
        onCancel={form.handleCancel}
        onSaveDraft={form.handleSaveDraft}
        error={form.errors.submit}
      />
    </>
  );

  return (
    <>
      {/* ══ Main Shell ══ */}
      <FullpageFormShell
        rightPanel={rightPanel}
      >
        {/* Desktop breadcrumb — inline above form (not in header) */}
        <Breadcrumb
          items={[
            { label: "Hợp đồng", href: "/contracts" },
            { label: mode === "create" ? "Tạo mới" : "Chỉnh sửa" },
          ]}
          className="max-lg:hidden mb-4"
        />

        {/* Section 1: Contract Info */}
        <ContractInfoSection
          formData={form.formData}
          updateField={form.updateField}
          showDeliveryDate={form.shouldShowDeliveryDate}
          badgeCode={badgeCode}
        />

        {/* Section 2: Customer */}
        <ContractCustomerSection
          customer={form.customer}
          showCoupleFields={form.shouldShowCoupleFields}
          formData={form.formData}
          updateField={form.updateField}
          error={form.errors.customer_id}
        />

        {/* Section 3: Items */}
        <ContractItemsSection
          items={form.items}
          error={form.errors.items}
        />

        {/* Section 4+5: Mobile inline — desktop shows in rightPanel sidebar */}
        <div className="lg:hidden space-y-4">
          <ContractFinancialSummary
            financials={form.financials}
            isEditMode={mode === "edit"}
          />
          {form.shouldShowPaymentSection && (
            <ContractPaymentSection financials={form.financials} />
          )}
        </div>

        {/* Section 6: Notes */}
        <section className="card-base p-6 space-y-4">
          <h3 className="form-section-heading">6. Ghi chú</h3>
          <Textarea unstyled
            value={form.formData.notes}
            onChange={(e) => form.updateField("notes", e.target.value)}
            placeholder="Ghi chú nội bộ hoặc yêu cầu đặc biệt từ khách hàng..."
            rows={4}
            className="input-base resize-none"
          />
        </section>
      </FullpageFormShell>

      {/* ══ Mobile fixed footer — hidden on desktop (lg:hidden inside FormActions) ══ */}
      <FormActions
        variant="fixed"
        isSubmitting={form.isSubmitting}
        isEditMode={mode === "edit"}
        onSubmit={form.handleSubmit}
        onCancel={form.handleCancel}
        onSaveDraft={form.handleSaveDraft}
        error={form.errors.submit}
      />

      {/* ══ Modals ══ */}
      <ItemModal
        isOpen={form.items.showItemModal}
        onClose={form.items.closeItemModal}
        mode={form.items.itemModalMode}
        editingItem={form.items.editingItemIndex !== null ? form.items.items[form.items.editingItemIndex] : undefined}
        onAddItem={form.items.addItem}
        onEditItem={(partial) => {
          if (form.items.editingItemIndex !== null) {
            form.items.editItem(form.items.editingItemIndex, partial);
          }
        }}
        onOpenCreateService={(itemType) => {
          setCreateServiceItemType(itemType === "san_pham" ? "san_pham" : "dich_vu");
          setShowCreateService(true);
        }}
      />

      <CreateServiceModal
        isOpen={showCreateService}
        onClose={() => setShowCreateService(false)}
        itemType={createServiceItemType}
        onCreated={(svc) => {
          setShowCreateService(false);
          const itemType = createServiceItemType === "san_pham" || svc.unit === "san_pham"
            ? "san_pham"
            : "dich_vu";
          form.items.addItem({
            service_id: svc.id,
            dress_id: null,
            item_name: svc.service_name,
            quantity: 1,
            unit_price: svc.selling_price,
            original_price: svc.selling_price,
            discount_amount: 0,
            total_amount: svc.selling_price,
            type: itemType,
            export_type: itemType === "san_pham" ? "xuat_ban" : null,
            is_addon: false,
            addon_category: null,
            notes: "",
          });
        }}
      />

      <CustomerFormModal
        isOpen={form.customer.showCustomerModal}
        onClose={() => form.customer.setShowCustomerModal(false)}
        onCreated={(cust) => {
          form.customer.selectCustomer(cust);
          form.customer.setShowCustomerModal(false);
        }}
        showCoupleFields={form.shouldShowCoupleFields}
        initialName={form.customer.searchQuery}
      />
    </>
  );
}
