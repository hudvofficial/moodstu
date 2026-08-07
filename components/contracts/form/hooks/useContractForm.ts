"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createContract } from "@/app/actions/contract-mutations";
import { getNextContractCode, getContractForEdit } from "@/app/actions/contract-queries";
import { getCustomerById } from "@/app/actions/customer-actions";
import {
  invalidateContractAfterWrite,
  invalidateDressAfterWrite,
  invalidateFinanceAfterWrite,
} from "@/lib/cache-invalidation";
import { useContractCustomer } from "./useContractCustomer";
import { useContractItems } from "./useContractItems";
import { useContractFinancials } from "./useContractFinancials";
import { showCoupleFields } from "@/types/contract-form";
import type { ContractFormData, ContractFormMode } from "@/types/contract-form";
import type { ContractScheduleInput } from "@/types/contract-schedule";
import type { ContractStatus, ServiceType } from "@/types/contract";
import {
  ContractScheduleValidationError,
  summarizeContractSchedules,
} from "@/lib/contracts/contract-schedule";

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

function defaultSchedules(
  serviceType: ServiceType,
  workDate = "",
  weddingDate = "",
): ContractScheduleInput[] {
  if (serviceType === "outsource") return [];

  if (serviceType === "ngay_cuoi") {
    return [{ eventType: "ngay_to_chuc", title: "Ngày cưới", date: weddingDate || workDate, isPrimaryWeddingDate: true, sortOrder: 1 }];
  }

  const schedules: ContractScheduleInput[] = [{
    eventType: "ngay_chup",
    title: serviceType === "studio" ? "Studio" : "Ngày chụp",
    date: workDate,
    sortOrder: 1,
  }];
  if (serviceType === "studio" || serviceType === "combo") {
    schedules.push({ eventType: "ngay_to_chuc", title: "Ngày cưới", date: weddingDate, isPrimaryWeddingDate: true, sortOrder: 2 });
  }
  return schedules;
}

function adaptSchedulesToService(serviceType: ServiceType, current: ContractScheduleInput[]) {
  const shoots = current.filter((item) => item.eventType === "ngay_chup");
  const ceremonies = current.filter((item) => item.eventType === "ngay_to_chuc");
  if (serviceType === "ngay_cuoi") {
    return (ceremonies.length ? ceremonies : defaultSchedules(serviceType)).map((item, index) => ({
      ...item,
      isPrimaryWeddingDate: item.isPrimaryWeddingDate || index === 0,
      sortOrder: index + 1,
    }));
  }
  const next = shoots.length ? [...shoots] : defaultSchedules(serviceType).filter((item) => item.eventType === "ngay_chup");
  if (serviceType === "studio" || serviceType === "combo") {
    next.push(...(
      ceremonies.length
        ? ceremonies
        : defaultSchedules(serviceType).filter((item) => item.eventType === "ngay_to_chuc")
    ));
  }
  return next.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

interface UseContractFormProps {
  mode: ContractFormMode;
  contractId?: string;
}

export function useContractForm({ mode, contractId }: UseContractFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams?.get("customer_id");

  // ── Core state ──
  const [formData, setFormData] = useState<ContractFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string>("");
  const [weddingDate, setWeddingDate] = useState<string>("");
  const [schedules, setSchedules] = useState<ContractScheduleInput[]>(
    () => defaultSchedules(DEFAULT_FORM_DATA.service_type),
  );

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
  // Adjust state during render instead of in an effect to avoid a cascading render.
  const [prevSelectedCustomer, setPrevSelectedCustomer] = useState(customer.selectedCustomer);
  if (customer.selectedCustomer !== prevSelectedCustomer) {
    setPrevSelectedCustomer(customer.selectedCustomer);
    const c = customer.selectedCustomer;
    if (c) {
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
      if (c.wedding_date) {
        setWeddingDate(c.wedding_date);
      } else {
        setWeddingDate("");
      }
    }
  }

  // ── Prefill from URL (Create Mode) ──
  useEffect(() => {
    if (mode === "create" && prefillCustomerId && !customer.selectedCustomer) {
      getCustomerById(prefillCustomerId)
        .then((res) => {
          if (res.success && res.data.customer) {
            const cust = res.data.customer as any;
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
        })
        .catch((err) => console.error("Lỗi tự động điền khách hàng:", err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, prefillCustomerId]);

  // ── Conditional fields ──
  const shouldShowCoupleFields = useMemo(
    () => showCoupleFields(formData.service_type),
    [formData.service_type]
  );
  const shouldShowPaymentSection = mode === "create";

  // ── Generic field updater ──
  const updateField = useCallback(
    <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (field === "service_type") {
        setSchedules((current) => adaptSchedulesToService(value as ServiceType, current));
      }
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

  const updateSchedule = useCallback((index: number, patch: Partial<ContractScheduleInput>) => {
    setSchedules((current) => {
      const next = current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return patch.isPrimaryWeddingDate && item.eventType === "ngay_to_chuc"
            ? { ...item, isPrimaryWeddingDate: false }
            : item;
        }
        return { ...item, ...patch };
      }).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex + 1 }));

      setFormData((currentForm) => ({
        ...currentForm,
        work_date: next.find((item) => item.eventType === "ngay_chup")?.date || "",
      }));
      setWeddingDate(next.find(
        (item) => item.eventType === "ngay_to_chuc" && item.isPrimaryWeddingDate,
      )?.date || "");
      return next;
    });
    setErrors((current) => {
      if (!current.schedules && !current.weddingDate && !current.work_date) return current;
      const next = { ...current };
      delete next.schedules;
      delete next.weddingDate;
      delete next.work_date;
      return next;
    });
  }, []);

  const addSchedule = useCallback((eventType: ContractScheduleInput["eventType"]) => {
    setSchedules((current) => [...current, {
      eventType,
      title: eventType === "ngay_chup" ? "Ngày chụp" : "Ngày cưới",
      date: "",
      isPrimaryWeddingDate: eventType === "ngay_to_chuc"
        ? !current.some((item) => item.eventType === "ngay_to_chuc" && item.isPrimaryWeddingDate)
        : undefined,
      sortOrder: current.length + 1,
    }]);
  }, []);

  const removeSchedule = useCallback((index: number) => {
    setSchedules((current) => {
      const removedWasPrimary = current[index]?.isPrimaryWeddingDate;
      const next = current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({ ...item, sortOrder: itemIndex + 1 }));
      if (removedWasPrimary) {
        const firstCeremonyIndex = next.findIndex((item) => item.eventType === "ngay_to_chuc");
        if (firstCeremonyIndex >= 0) next[firstCeremonyIndex].isPrimaryWeddingDate = true;
      }
      setFormData((currentForm) => ({
        ...currentForm,
        work_date: next.find((item) => item.eventType === "ngay_chup")?.date || "",
      }));
      setWeddingDate(next.find(
        (item) => item.eventType === "ngay_to_chuc" && item.isPrimaryWeddingDate,
      )?.date || "");
      return next;
    });
  }, []);

  // ── Validate form before submit ──
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customer.selectedCustomer) {
      newErrors.customer_id = "Vui lòng chọn khách hàng";
    }
    if (items.items.length === 0) {
      newErrors.items = "Phải có ít nhất 1 dịch vụ";
    }

    try {
      summarizeContractSchedules(formData.service_type, schedules);
    } catch (error) {
      newErrors.schedules = error instanceof ContractScheduleValidationError
        ? error.issues[0]
        : "Lịch trình hợp đồng không hợp lệ";
    }

    const contractDate = formData.contract_date;
    const earliestOperationalDate = schedules
      .filter((item) => item.date)
      .map((item) => item.date)
      .sort()[0];

    if (contractDate && earliestOperationalDate && earliestOperationalDate < contractDate) {
      newErrors.schedules = "Ngày thực hiện phải sau hoặc bằng ngày ký hợp đồng";
    }

    setErrors(newErrors);
    const hasErrors = Object.keys(newErrors).length > 0;

    if (hasErrors) {
      // Toast cảnh báo tổng quát — luôn visible dù error nằm ngoài viewport
      const errorMessages = Object.values(newErrors);
      toast.error(errorMessages[0], { duration: 4000 });

      // Auto-scroll đến error đầu tiên
      requestAnimationFrame(() => {
        const errorEl = document.querySelector(".error-text");
        errorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    return !hasErrors;
  }, [customer.selectedCustomer, items.items.length, formData.contract_date, formData.service_type, schedules]);

  // ── Submit (internal, reused by both submit + draft) ──
  const handleSubmitInternal = useCallback(async (statusOverride?: ContractFormData["status"]) => {
    if (!validate()) return;
    if (!customer.selectedCustomer) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Reuse preview code (already fetched on mount) — avoid double-fetch
      let contractCode = formData.contract_code;
      if (mode === "create") {
        contractCode = previewCode || (await getNextContractCode().then(r => {
          if (!r.success) throw new Error(r.error);
          return r.data;
        }));
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
        weddingDate: weddingDate || undefined,
        schedules,
        existingContractId: contractId,
        expectedUpdatedAt: expectedUpdatedAt || undefined,
      };

      const result = await createContract(payload);

      if (!result.success) {
        setErrors({ submit: result.error });
        return;
      }

      // Redirect to detail page
      if (result.data.warnings?.length) {
        toast.warning(
          `Hợp đồng đã lưu, nhưng cần kiểm tra: ${result.data.warnings.join("; ")}`,
          { duration: 7000 },
        );
      }
      await Promise.all([
        invalidateContractAfterWrite(result.data.id),
        invalidateFinanceAfterWrite(),
        invalidateDressAfterWrite(),
      ]);
      router.push(`/contracts/${result.data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, previewCode, formData, customer.selectedCustomer, items.items, financials, contractId, expectedUpdatedAt, router, validate, weddingDate, schedules]);

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

      const { contract, customer: cust, items: editItems, schedules: editSchedules, paidAmount, updatedAt } = result.data;

      // Populate form data
      setFormData({
        contract_code: contract.contract_code,
        customer_id: contract.customer_id,
        service_type: contract.service_type as ServiceType,
        transaction_type: contract.transaction_type || "hop_dong",
        contract_date: contract.contract_date || "",
        work_date: contract.work_date || "",
        delivery_date: contract.delivery_date || "",
        status: contract.status as ContractStatus,
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
        if (cust.wedding_date) setWeddingDate(cust.wedding_date);
      }
      setSchedules(editSchedules.length
        ? editSchedules
        : defaultSchedules(contract.service_type as ServiceType, contract.work_date || "", cust?.wedding_date || ""));
      setWeddingDate(
        editSchedules.find((item) => item.eventType === "ngay_to_chuc" && item.isPrimaryWeddingDate)?.date ||
        cust?.wedding_date ||
        "",
      );
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
    setSchedules(defaultSchedules(DEFAULT_FORM_DATA.service_type));
    setWeddingDate("");
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
    shouldShowPaymentSection,
    weddingDate,
    setWeddingDate,
    schedules,
    updateSchedule,
    addSchedule,
    removeSchedule,
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
