"use client";

import useSWR from "swr";
import {
  fetchEmployeeJobDetails,
  fetchProductivityData,
} from "@/app/actions/productivity-actions";
import { cacheKeys } from "@/lib/swr";
import type { ActionResult } from "@/types/common";
import type {
  EmployeeJobGroup,
  ProductivityPagePayload,
  ProductivityPeriod,
  ProductivityViewMode,
} from "@/types/productivity";

interface OverviewOptions {
  period: ProductivityPeriod;
  viewMode: ProductivityViewMode;
  fallbackData?: ActionResult<ProductivityPagePayload>;
}

interface DetailOptions {
  employeeId: string | null;
  startDate: string;
  endDate: string;
  fallbackData?: ActionResult<EmployeeJobGroup[]>;
}

export function useProductivityOverview({
  period,
  viewMode,
  fallbackData,
}: OverviewOptions) {
  const key = cacheKeys.productivity(period, viewMode);
  const { data, error, isLoading, mutate } = useSWR<
    ActionResult<ProductivityPagePayload>
  >(key, () => fetchProductivityData(period), {
    fallbackData,
    keepPreviousData: true,
    revalidateOnMount: fallbackData ? false : undefined,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    cacheKey: key,
    result: data,
    payload: data?.success ? data.data : null,
    isLoading,
    error,
    mutate,
  };
}

export function useProductivityDetail({
  employeeId,
  startDate,
  endDate,
  fallbackData,
}: DetailOptions) {
  const key =
    employeeId && startDate && endDate
      ? cacheKeys.productivityJobDetails(employeeId, startDate, endDate)
      : null;

  const { data, error, isLoading, mutate } = useSWR<
    ActionResult<EmployeeJobGroup[]>
  >(
    key,
    () =>
      employeeId
        ? fetchEmployeeJobDetails(employeeId, startDate, endDate)
        : Promise.resolve({ success: true, data: [] } as const),
    {
      fallbackData,
      keepPreviousData: false,
      revalidateOnMount: fallbackData ? false : undefined,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    cacheKey: key,
    result: data,
    groups: data?.success ? data.data : [],
    isLoading,
    error,
    mutate,
  };
}
