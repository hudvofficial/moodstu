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
import { FullpageFormShell } from "@/components/layout/fullpage-form-shell";
import { Loader2, Fingerprint, ChevronRight, ArrowLeft } from "lucide-react";
import type { ContractFormMode } from "@/types/contract-form";

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

export default function ContractForm({ mode, contractId }: Props) {
  const form = useContractForm({ mode, contractId });
  const [showCreateService, setShowCreateService] = useState(false);

  // Load data for edit mode
  useEffect(() => {
    if (mode === "edit" && contractId) {
      form.loadContractForEdit(contractId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, contractId]);

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
          <button
            onClick={() => form.handleCancel()}
            className="btn btn-interactive mt-4"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // ── Unified badge code (preview for create, actual for edit) ──
  const badgeCode = mode === "create" ? form.previewCode : form.formData.contract_code;

  // ══════════════════════════════
  // Slots for FullpageFormShell
  // ══════════════════════════════

  /** Left slot: breadcrumb back button */
  const breadcrumb = (
    <>
      {/* Desktop: full breadcrumb — clone từ top-action-bar.tsx */}
      <nav className="max-lg:hidden flex items-center gap-2 text-body-sm text-text-secondary">
        <Link
          href="/contracts"
          className="hover:text-primary transition-colors"
        >
          Hợp đồng
        </Link>
        <ChevronRight size={14} className="text-text-muted" />
        <span className="text-text-primary font-medium">
          {mode === "create" ? "Tạo mới" : "Chỉnh sửa"}
        </span>
      </nav>

      {/* Mobile: ← + title inline */}
      <div className="lg:hidden flex items-center gap-2">
        <Link href="/contracts" className="btn-icon shrink-0 -ml-2">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-base font-semibold text-text-primary truncate">
          {mode === "create" ? "Tạo hợp đồng mới" : "Sửa hợp đồng"}
        </span>
      </div>
    </>
  );

  /** Right slot: contract code badge */
  const headerRight = badgeCode ? (
    <div className="flex items-center gap-2 rounded-md bg-interactive/10 text-interactive px-3 py-1.5 border border-interactive/20 shrink-0">
      <Fingerprint className="h-3.5 w-3.5" />
      <span className="text-caption font-bold tracking-wider">
        {badgeCode}
      </span>
    </div>
  ) : undefined;

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
        breadcrumb={breadcrumb}
        headerRight={headerRight}
        rightPanel={rightPanel}
      >
        {/* Title — desktop only (mobile shows in header) */}
        <div className="max-lg:hidden space-y-1">
          <h2 className="text-h2">
            {mode === "create" ? "Tạo hợp đồng" : "Sửa hợp đồng"}
          </h2>
          <p className="text-body-sm text-text-secondary">
            {mode === "create"
              ? "Điền thông tin để tạo hợp đồng mới"
              : "Chỉnh sửa thông tin hợp đồng"}
          </p>
        </div>

        {/* Section 1: Contract Info */}
        <ContractInfoSection
          formData={form.formData}
          updateField={form.updateField}
          showDeliveryDate={form.shouldShowDeliveryDate}
          isEditMode={mode === "edit"}
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
          <textarea
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
        onOpenCreateService={() => setShowCreateService(true)}
      />

      <CreateServiceModal
        isOpen={showCreateService}
        onClose={() => setShowCreateService(false)}
        onCreated={(svc) => {
          setShowCreateService(false);
          form.items.addItem({
            service_id: svc.id,
            inventory_item_id: null,
            item_name: svc.service_name,
            quantity: 1,
            unit_price: svc.selling_price,
            original_price: svc.selling_price,
            discount_amount: 0,
            total_amount: svc.selling_price,
            type: "dich_vu",
            export_type: svc.service_type === "trang_phuc" ? "xuat_thue" : null,
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
