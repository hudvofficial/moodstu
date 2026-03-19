/**
 * 📦 Contract SWR Hooks (V2)
 *
 * Client-side cache layer for contract data.
 * Pattern: SWR → Server Actions (not Supabase client directly)
 */

import useSWR, { mutate } from "swr";
import type { ContractFilters, ContractStats } from "@/types/contract";
import {
  getContracts,
  getContractStats,
  getContractById,
} from "@/app/actions/contracts";

// ─── Cache Key Factory ──────────────────────────────────

const contractKeys = {
  list: (filters: ContractFilters) =>
    ["contracts", JSON.stringify(filters)] as const,
  stats: () => ["contract-stats"] as const,
  detail: (id: string) => ["contract", id] as const,
};

// ─── useContracts ───────────────────────────────────────

export function useContracts(filters: ContractFilters) {
  const { data, error, isLoading, mutate } = useSWR(
    contractKeys.list(filters),
    async () => {
      const result = await getContracts(filters);
      if (!result.success) throw new Error(result.error);
      return result.data as {
        contracts: Record<string, unknown>[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  return {
    contracts: data?.contracts || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    isLoading,
    error,
    mutate,
  };
}

// ─── useContractStats ───────────────────────────────────

export function useContractStats() {
  const { data, error, isLoading, mutate } = useSWR(
    contractKeys.stats(),
    async () => {
      const result = await getContractStats();
      if (!result.success) throw new Error(result.error);
      return result.data as ContractStats;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    stats: data || null,
    isLoading,
    error,
    mutate,
  };
}

// ─── useContractDetail ──────────────────────────────────

export function useContractDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? contractKeys.detail(id) : null,
    async () => {
      if (!id) return null;
      const result = await getContractById(id);
      if (!result.success) throw new Error(result.error);
      return result.data as {
        contract: Record<string, unknown>;
        payments: Record<string, unknown>[];
        paymentPlans: Record<string, unknown>[];
        reservations: Record<string, unknown>[];
        printOrders: Record<string, unknown>[];
        auditLogs: Record<string, unknown>[];
      };
    },
    {
      revalidateOnFocus: false,
    }
  );

  return {
    contract: data?.contract || null,
    payments: data?.payments || [],
    paymentPlans: data?.paymentPlans || [],
    reservations: data?.reservations || [],
    printOrders: data?.printOrders || [],
    auditLogs: data?.auditLogs || [],
    isLoading,
    error,
    mutate,
  };
}

// ─── Revalidation Helpers (ref: mcoffe lib/swr.ts) ──────

/** Invalidate all contract-related SWR caches after mutation */
export async function revalidateContractCaches(contractId?: string) {
  await Promise.all([
    contractId ? mutate(contractKeys.detail(contractId)) : Promise.resolve(),
    mutate((key: unknown) => {
      if (!Array.isArray(key)) return false;
      return key[0] === "contracts";
    }, undefined, { revalidate: true }),
    mutate(contractKeys.stats()),
  ]);
}

/** Pre-warm SWR cache — call on hover for instant navigation */
export function prefetchContract(id: string) {
  const key = contractKeys.detail(id);
  mutate(key, getContractById(id).then(r => r.success ? r.data : undefined), {
    revalidate: false,
  });
}

// ─── Export cache keys for invalidation ─────────────────

export { contractKeys };
