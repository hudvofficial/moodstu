"use client";

import { useState, useCallback, useMemo } from "react";
import type { ContractPaymentFormData } from "@/types/contract-form";
import type { PaymentStatus } from "@/types/contract";

// ═══════════════════════════════════════════
// useContractFinancials — Discount + Payment + Totals
// V1 pattern: auto-sync payment_status from amounts
// ═══════════════════════════════════════════

const DEFAULT_PAYMENT: ContractPaymentFormData = {
  amount: 0,
  payment_method: "tien_mat",
  payment_stage: "dat_coc",
  notes: "",
};

export type DiscountType = "fixed" | "percent";

export function useContractFinancials(subtotal: number) {
  // ── State ──
  const [discount, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [paidAmount, setPaidAmount] = useState(0); // read-only on edit
  const [paymentForm, setPaymentForm] = useState<ContractPaymentFormData>(DEFAULT_PAYMENT);

  // ── Derived calculations ──
  const discountAmount = useMemo(
    () => discountType === "percent" ? Math.round(subtotal * discount / 100) : discount,
    [subtotal, discount, discountType]
  );

  const totalAmount = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );

  const remainingAmount = useMemo(
    () => totalAmount - paidAmount,
    [totalAmount, paidAmount]
  );

  const paymentStatus: PaymentStatus = useMemo(() => {
    if (paidAmount <= 0) return "chua_thanh_toan";
    if (paidAmount >= totalAmount) return "da_thanh_toan";
    return "thanh_toan_mot_phan";
  }, [paidAmount, totalAmount]);

  // ── Update discount (with validation) ──
  const updateDiscount = useCallback(
    (value: number) => {
      if (discountType === "percent") {
        setDiscountValue(Math.max(0, Math.min(value, 100)));
      } else {
        setDiscountValue(Math.max(0, Math.min(value, subtotal)));
      }
    },
    [subtotal, discountType]
  );

  // ── Update payment form field ──
  const updatePaymentForm = useCallback(
    <K extends keyof ContractPaymentFormData>(
      field: K,
      value: ContractPaymentFormData[K]
    ) => {
      setPaymentForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ── Pre-fill for edit mode ──
  const prefillFinancials = useCallback(
    (editDiscount: number, editPaidAmount: number) => {
      setDiscountValue(editDiscount);
      setPaidAmount(editPaidAmount);
    },
    []
  );

  // ── Reset ──
  const resetFinancials = useCallback(() => {
    setDiscountValue(0);
    setPaidAmount(0);
    setPaymentForm(DEFAULT_PAYMENT);
  }, []);

  return {
    // State
    discount,
    discountType,
    paidAmount,
    paymentForm,
    // Derived
    discountAmount,
    totalAmount,
    remainingAmount,
    paymentStatus,
    // Actions
    updateDiscount,
    setDiscountType,
    updatePaymentForm,
    prefillFinancials,
    resetFinancials,
  };
}

export type UseContractFinancialsReturn = ReturnType<typeof useContractFinancials>;
