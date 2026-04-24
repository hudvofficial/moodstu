"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createContract } from "@/app/actions/contract-mutations";
import { getNextContractCode, getContractForEdit } from "@/app/actions/contract-queries";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { useContractCustomer } from "./useContractCustomer";
import { useContractItems } from "./useContractItems";
import { useContractFinancials } from "./useContractFinancials";
import { showCoupleFields, showDeliveryDate } from "@/types/contract-form";
import type { ContractFormData, ContractFormMode } from "@/types/contract-form";
import type { ServiceType } from "@/types/contract";

// ═══════════════════════════════════════════
// useContractForm — Orchestrator
// Composes: customer + items + financials hooks
// V1 pattern: 629 lines → compressed to ~200 lines
// ═══════════════════════════════════════════

const DEFAULT_FORM_DATA: ContractFormData = {
  contract_code: "",
  customer_id: "",
  service_type: "studio",
  transaction_type: "hop_dong",
  contract_date: new Date().toISOString().split("T")[0],
  work_date: "",
  delivery_date: "",
  status: "cho_xu_ly",
  description: "",
  notes: "",
  assigned_to: "",
  bride_name: "",
  groom_name: "",
  // Couple detail fields (Phase 01)
  bride_phone: "",
  bride_height: "",
  bride_weight: "",
  bride_shoe_size: "",
  groom_phone: "",
  groom_height: "",
  groom_weight: "",
  groom_shoe_size: "",
};

function normalizeEmployeeId(value: unknown): string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : "";
}

interface UseContractFormProps {
  mode: ContractFormMode;
  contractId?: string;
}

export function useContractForm({ mode, contractId }: UseContractFormProps) {
  const router = useRouter();

  // ── Core state ──
  const [formData, setFormData] = useState<ContractFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string>("");

  // [V1 PORT] Preview contract code — fetch on mount (create mode)
  const [previewCode, setPreviewCode] = useState("");
  useEffect(() => {
    if (mode === "create") {
      getNextContractCode().then((result) => {
        if (result.success) setPreviewCode(result.data);
      });
    }
  }, [mode]);

  // ── Sub-hooks ──
  const customer = useContractCustomer();
  const items = useContractItems();
  const financials = useContractFinancials(items.subtotal);

  // ── [V1 PORT + IMPROVEMENT] Auto-fill couple fields from selected customer ──
  // V1 only filled on create. V2 fills on BOTH select existing + create new.
  useEffect(() => {
    const c = customer.selectedCustomer;
    if (!c) return;
    setFormData((prev) => ({
      ...prev,
      customer_id: c.id,
      bride_name: c.bride_name || prev.bride_name,
      groom_name: c.groom_name || prev.groom_name,
      bride_phone: c.bride_phone || prev.bride_phone,
      bride_height: c.bride_height?.toString() || prev.bride_height,
      bride_weight: c.bride_weight?.toString() || prev.bride_weight,
      bride_shoe_size: c.bride_shoe_size?.toString() || prev.bride_shoe_size,
      groom_phone: c.groom_phone || prev.groom_phone,
      groom_height: c.groom_height?.toString() || prev.groom_height,
      groom_weight: c.groom_weight?.toString() || prev.groom_weight,
      groom_shoe_size: c.groom_shoe_size?.toString() || prev.groom_shoe_size,
    }));
  }, [customer.selectedCustomer]);

  // ── Conditional fields ──
  const shouldShowCoupleFields = useMemo(
    () => showCoupleFields(formData.service_type),
    [formData.service_type]
  );
  const shouldShowDeliveryDate = useMemo(
    () => showDeliveryDate(formData.service_type),
    [formData.service_type]
  );
  const shouldShowPaymentSection = mode === "create";

  // ── Generic field updater ──
  const updateField = useCallback(
    <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear field error on change
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  // ── Validate form before submit ──
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customer.selectedCustomer) {
      newErrors.customer_id = "Vui lòng chọn khách hàng";
    }
    if (items.items.length === 0) {
      newErrors.items = "Phải có ít nhất 1 dịch vụ";
    }

    // W5 fix: Date order validation
    const contractDate = formData.contract_date;
    const workDate = formData.work_date;
    const deliveryDate = formData.delivery_date;

    if (contractDate && workDate && workDate < contractDate) {
      newErrors.work_date = "Ngày làm phải sau ngày ký hợp đồng";
    }
    if (workDate && deliveryDate && deliveryDate < workDate) {
      newErrors.delivery_date = "Ngày giao phải sau ngày làm";
    }
    if (contractDate && deliveryDate && !workDate && deliveryDate < contractDate) {
      newErrors.delivery_date = "Ngày giao phải sau ngày ký hợp đồng";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [customer.selectedCustomer, items.items.length, formData.contract_date, formData.work_date, formData.delivery_date]);

  // ── Submit (internal, reused by both submit + draft) ──
  const handleSubmitInternal = useCallback(async (statusOverride?: ContractFormData["status"]) => {
    if (!validate()) return;
    if (!customer.selectedCustomer) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Generate code if creating
      let contractCode = formData.contract_code;
      if (mode === "create") {
        const codeResult = await getNextContractCode();
        if (!codeResult.success) throw new Error(codeResult.error);
        contractCode = codeResult.data;
      }

      const effectiveFormData = {
        ...formData,
        status: statusOverride || formData.status,
      };

      const payload = {
        formData: {
          ...effectiveFormData,
          contract_code: contractCode,
          customer_id: customer.selectedCustomer?.id || "",
        },
        items: items.items.map((item) => ({
          service_id: item.service_id,
          dress_id: item.dress_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          original_price: item.original_price,
          discount_amount: item.discount_amount,
          total_amount: item.total_amount,
          type: item.type,
          export_type: item.export_type,
          is_addon: item.is_addon,
          addon_category: item.addon_category,
          notes: item.notes,
        })),
        paymentInfo: financials.paymentForm,
        financials: {
          total_amount: financials.totalAmount,
          discount_amount: financials.discount,
          paid_amount: financials.paidAmount,
          remaining_amount: financials.remainingAmount,
        },
        existingContractId: contractId,
        expectedUpdatedAt: expectedUpdatedAt || undefined,
      };

      const result = await createContract(payload);

      if (!result.success) {
        setErrors({ submit: result.error });
        return;
      }

      // Redirect to detail page
      await revalidateContractCaches(result.data.id);
      router.push(`/contracts/${result.data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, formData, customer.selectedCustomer, items.items, financials, contractId, expectedUpdatedAt, router, validate]);

  // ── Save Draft ──
  const handleSaveDraft = useCallback(async () => {
    await handleSubmitInternal("cho_xu_ly");
  }, [handleSubmitInternal]);

  // ── Submit (public) ──
  const handleSubmit = useCallback(async () => {
    await handleSubmitInternal();
  }, [handleSubmitInternal]);

  // ── Load contract for edit ──
  const loadContractForEdit = useCallback(async (editId: string) => {
    setIsLoading(true);
    try {
      const result = await getContractForEdit(editId);
      if (!result.success) throw new Error(result.error);

      const { contract, customer: cust, items: editItems, paidAmount, updatedAt } = result.data;

      // Populate form data
      setFormData({
        contract_code: contract.contract_code,
        customer_id: contract.customer_id,
        service_type: contract.service_type as ServiceType,
        transaction_type: contract.transaction_type || "hop_dong",
        contract_date: contract.contract_date || "",
        work_date: contract.work_date || "",
        delivery_date: contract.delivery_date || "",
        status: contract.status,
        description: contract.description || "",
        notes: contract.notes || "",
        assigned_to: normalizeEmployeeId(contract.assigned_to),
        bride_name: cust?.bride_name || "",
        groom_name: cust?.groom_name || "",
        bride_phone: cust?.bride_phone || "",
        bride_height: cust?.bride_height?.toString() || "",
        bride_weight: cust?.bride_weight?.toString() || "",
        bride_shoe_size: cust?.bride_shoe_size?.toString() || "",
        groom_phone: cust?.groom_phone || "",
        groom_height: cust?.groom_height?.toString() || "",
        groom_weight: cust?.groom_weight?.toString() || "",
        groom_shoe_size: cust?.groom_shoe_size?.toString() || "",
      });

      // Populate sub-hooks
      if (cust) {
        customer.prefillCustomer({
          id: cust.id,
          full_name: cust.full_name,
          phone: cust.phone,
          bride_name: cust.bride_name,
          groom_name: cust.groom_name,
          bride_phone: cust.bride_phone ?? null,
          bride_height: cust.bride_height ?? null,
          bride_weight: cust.bride_weight ?? null,
          bride_shoe_size: cust.bride_shoe_size ?? null,
          groom_phone: cust.groom_phone ?? null,
          groom_height: cust.groom_height ?? null,
          groom_weight: cust.groom_weight ?? null,
          groom_shoe_size: cust.groom_shoe_size ?? null,
          wedding_date: cust.wedding_date ?? null,
          address: cust.address ?? null,
        });
      }
      items.prefillItems(editItems);
      financials.prefillFinancials(contract.discount_amount || 0, paidAmount);
      setExpectedUpdatedAt(updatedAt);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải hợp đồng";
      setErrors({ load: message });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cancel (go back) ──
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  // ── Reset form ──
  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    customer.clearCustomer();
    financials.resetFinancials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // Core state
    formData,
    mode,
    previewCode,
    isSubmitting,
    isLoading,
    errors,
    // Conditional flags
    shouldShowCoupleFields,
    shouldShowDeliveryDate,
    shouldShowPaymentSection,
    // Sub-hooks (spread for component access)
    customer,
    items,
    financials,
    // Actions
    updateField,
    handleSubmit,
    handleSaveDraft,
    handleCancel,
    loadContractForEdit,
    resetForm,
  };
}

export type UseContractFormReturn = ReturnType<typeof useContractForm>;
