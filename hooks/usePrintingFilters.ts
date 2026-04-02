"use client";

import { useCallback } from "react";
import { useListFilters } from "@/hooks/useListFilters";

const PRINTING_FILTER_DEFAULTS = {
  status: "all",
  q: "",
  labId: "all",
  paymentStatus: "all",
  page: "1",
} as const;

export function usePrintingFilters() {
  const { params, setParam, setParams, resetParams, hasActiveFilters } =
    useListFilters(PRINTING_FILTER_DEFAULTS);

  const filters = {
    status: params.status,
    search: params.q,
    labId: params.labId,
    paymentStatus: params.paymentStatus,
    page: Number(params.page) || 1,
  };

  const setStatus = useCallback(
    (status: string) => setParams({ status, page: "1" }),
    [setParams],
  );

  const setLabId = useCallback(
    (labId: string) => setParams({ labId, page: "1" }),
    [setParams],
  );

  const setPaymentStatus = useCallback(
    (paymentStatus: string) => setParams({ paymentStatus, page: "1" }),
    [setParams],
  );

  const setPage = useCallback(
    (page: number) => setParam("page", String(page)),
    [setParam],
  );

  return {
    filters,
    setStatus,
    setLabId,
    setPaymentStatus,
    setPage,
    resetParams,
    hasActiveFilters,
  };
}

