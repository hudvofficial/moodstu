"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getApprovalRequests, type ApprovalRequestFilters } from "@/app/actions/inventory-queries";

export const inventoryKeys = {
  all: ["inventory"] as const,
  approvalsList: (filters: ApprovalRequestFilters) => [...inventoryKeys.all, "approvals", JSON.stringify(filters)] as const,
};

export function useApprovalRequests(filters: ApprovalRequestFilters) {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery({
    queryKey: inventoryKeys.approvalsList(filters),
    queryFn: async () => {
      const result = await getApprovalRequests(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  return {
    requests: data?.requests || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    isLoading,
    error,
    mutate: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.approvalsList(filters) }),
  };
}

export function useApprovalInvalidation() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  };
}
