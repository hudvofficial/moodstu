/**
 * 📦 Contract SWR Hooks (V2)
 *
 * Client-side cache layer for contract data.
 * Pattern: SWR → Server Actions (not Supabase client directly)
 */

import useSWR, { mutate } from "swr";
import { useEffect } from "react";
import type {
  ContractFilters,
  ContractStats,
  Contract,
  Payment,
  PaymentPlan,
  DressReservationRow,
  PrintingOrder,
  AuditLogEntry,
} from "@/types/contract";
import {
  getContractList,
  getContractStats,
  getContractDetail,
  getContractDrawerExtra,
} from "@/app/actions/contract-queries";

// ─── Cache Key Factory ──────────────────────────────────

const contractKeys = {
  list: (filters: ContractFilters) =>
    ["contracts", JSON.stringify(filters)] as const,
  stats: () => ["contract-stats"] as const,
  detail: (id: string) => ["contract", id] as const,
  drawerExtra: (id: string) => ["contract-drawer-extra", id] as const,
};

const prefetchedDrawerExtras = new Set<string>();
const prefetchedContractDetails = new Set<string>();

// ─── useContracts ───────────────────────────────────────

export function useContracts(
  filters: ContractFilters,
  fallbackData?: {
    contracts: Record<string, unknown>[];
    total: number;
    page: number;
    pageSize: number;
  },
) {
  const { data, error, isLoading, mutate } = useSWR(
    contractKeys.list(filters),
    async () => {
      const result = await getContractList(filters);
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
      fallbackData,
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

export function useContractStats(fallbackData?: ContractStats) {
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
      fallbackData,
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

export type ContractDetailData = {
  contract: Contract;
  payments: Payment[];
  paymentPlans: PaymentPlan[];
  reservations: DressReservationRow[];
  printOrders: PrintingOrder[];
  auditLogs: AuditLogEntry[];
};

export function useContractDetail(
  id: string | null,
  fallbackData?: ContractDetailData,
) {
  const { data, error, isLoading, mutate: mutateLocal } = useSWR(
    id ? contractKeys.detail(id) : null,
    async () => {
      if (!id) return null;
      const result = await getContractDetail(id);
      if (!result.success) throw new Error(result.error);
      return result.data as unknown as ContractDetailData;
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
      revalidateOnMount: !fallbackData,
    }
  );

  // ⚡ Seed SWR cache so mutate(updater) has data to work with.
  // fallbackData is only a render hint — it does NOT populate the cache.
  // Without this, applyTaskStatusOptimistic gets current=undefined.
  useEffect(() => {
    if (fallbackData && id) {
      void mutateLocal(fallbackData, { revalidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return {
    contract: data?.contract || null,
    payments: data?.payments || [],
    paymentPlans: data?.paymentPlans || [],
    reservations: data?.reservations || [],
    printOrders: data?.printOrders || [],
    auditLogs: data?.auditLogs || [],
    isLoading,
    error,
    mutate: mutateLocal,
  };
}

// ─── useContractDrawerExtra ─────────────────────────────
// Lazy-loads drawer sections: events, checklists, tasks, payment plans.
// Called AFTER drawer opens with instant partial data from list.

export function useContractDrawerExtra(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? contractKeys.drawerExtra(id) : null,
    async () => {
      if (!id) return null;
      const result = await getContractDrawerExtra(id);
      if (!result.success) throw new Error(result.error);
      return result.data as unknown as {
        events: Record<string, unknown>[];
        checklists: Record<string, unknown>[];
        workTasks: Record<string, unknown>[];
        paymentPlans: PaymentPlan[];
      };
    },
    {
      revalidateOnFocus: false,
    }
  );

  return {
    events: data?.events || [],
    checklists: data?.checklists || [],
    workTasks: data?.workTasks || [],
    paymentPlans: data?.paymentPlans || [],
    isLoadingExtra: isLoading,
    error,
  };
}

// ─── Revalidation Helpers (ref: mcoffe lib/swr.ts) ──────

/** Invalidate all contract-related SWR caches after mutation */
export async function revalidateContractCaches(contractId?: string) {
  await Promise.all([
    contractId ? mutate(contractKeys.detail(contractId)) : Promise.resolve(),
    contractId ? mutate(contractKeys.drawerExtra(contractId)) : Promise.resolve(),
    mutate((key: unknown) => {
      if (!Array.isArray(key)) return false;
      return key[0] === "contracts";
    }, undefined, { revalidate: true }),
    mutate((key: unknown) => {
      if (!Array.isArray(key)) return false;
      if (key[0] !== "contract-notes") return false;
      return contractId ? key[1] === contractId : true;
    }, undefined, { revalidate: true }),
    mutate(contractKeys.stats()),
  ]);
}

/** Revalidate only the detail-side caches. Use for detail page realtime to avoid list/stat refresh storms. */
export async function revalidateContractDetailCaches(contractId: string) {
  await Promise.all([
    mutate(contractKeys.detail(contractId)),
    mutate(contractKeys.drawerExtra(contractId)),
  ]);
}

/** Pre-warm SWR cache for drawer — lightweight action (4 queries vs 6) */
export function prefetchContract(id: string) {
  if (prefetchedDrawerExtras.has(id)) return;
  prefetchedDrawerExtras.add(id);

  const key = contractKeys.drawerExtra(id);
  mutate(
    key,
    getContractDrawerExtra(id)
      .then((r) => (r.success ? r.data : undefined))
      .catch(() => {
        prefetchedDrawerExtras.delete(id);
        return undefined;
      }),
    {
      revalidate: false,
    },
  );
}

// ─── Export cache keys for invalidation ─────────────────

/** Pre-warm full contract detail for the detail route. */
export function prefetchContractDetail(id: string) {
  if (prefetchedContractDetails.has(id)) return;
  prefetchedContractDetails.add(id);

  mutate(
    contractKeys.detail(id),
    getContractDetail(id)
      .then((r) => (r.success ? r.data : undefined))
      .catch(() => {
        prefetchedContractDetails.delete(id);
        return undefined;
      }),
    {
      revalidate: false,
    },
  );
}

export { contractKeys };
