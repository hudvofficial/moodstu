"use client";

import useSWR from "swr";
import { fetchOrderFulfillments } from "@/app/actions/inventory-queries";
import type { InventoryTransaction } from "@/types/inventory";

const fetcher = async (txnId: string) => {
  return fetchOrderFulfillments(txnId);
};

export function useOrderFulfillments(txnId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<InventoryTransaction[]>(
    txnId ? `order-fulfillments-${txnId}` : null,
    () => fetcher(txnId!),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    fulfillments: data || [],
    isLoading,
    error,
    mutate,
  };
}
