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
  ContractEvent,
  WorkTask,
  ContractChecklist,
  ContractChecklistSummary,
  Payment,
  PaymentPlan,
  DressReservationRow,
  PrintingOrder,
} from "@/types/contract";
import type { ActiveEmployee } from "@/types/employee";
import {
  getContractList,
  getContractStats,
  getContractDetail,
  getContractDrawerExtra,
} from "@/app/actions/contract-queries";
import { getActiveEmployees } from "@/app/actions/employee-queries";
import {
  revalidateContractCaches as revalidateContractCachesSSOT,
  revalidateContractDetailCaches as revalidateContractDetailCachesSSOT,
} from "@/lib/cache-invalidation";

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
const EMPTY_PAYMENTS: Payment[] = [];
const EMPTY_PAYMENT_PLANS: PaymentPlan[] = [];
const EMPTY_RESERVATIONS: DressReservationRow[] = [];
const EMPTY_PRINT_ORDERS: PrintingOrder[] = [];

type ContractListCache = {
  contracts?: Contract[];
} & Record<string, unknown>;

type ContractChecklistCacheItem = {
  id?: unknown;
  is_completed?: unknown;
} & Record<string, unknown>;

type ChecklistArrayUpdate = {
  value: unknown;
  changed: boolean;
  previousCompleted?: boolean;
};

type ContractChecklistSummaryCache = Partial<ContractChecklistSummary> &
  Record<string, unknown>;

type ContractDrawerExtraCache = {
  checklists?: unknown[];
} & Record<string, unknown>;

function updateChecklistArray(
  value: unknown,
  checklistId: string,
  isCompleted: boolean,
): ChecklistArrayUpdate {
  if (!Array.isArray(value)) {
    return { value, changed: false };
  }

  let changed = false;
  let previousCompleted: boolean | undefined;
  const next = value.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;

    const checklist = entry as ContractChecklistCacheItem;
    if (checklist.id !== checklistId) return entry;

    previousCompleted = checklist.is_completed === true;
    if (previousCompleted === isCompleted) return entry;

    changed = true;
    return { ...checklist, is_completed: isCompleted };
  });

  return { value: changed ? next : value, changed, previousCompleted };
}

function updateChecklistSummary(
  value: unknown,
  previousCompleted: boolean | undefined,
  isCompleted: boolean,
): { value: unknown; changed: boolean } {
  if (
    previousCompleted === undefined ||
    previousCompleted === isCompleted ||
    !value ||
    typeof value !== "object"
  ) {
    return { value, changed: false };
  }

  const summary = value as ContractChecklistSummaryCache;
  const total = Number(summary.total) || 0;
  const currentDone = Number(summary.done) || 0;
  const done = Math.min(
    total,
    Math.max(0, currentDone + (isCompleted ? 1 : -1)),
  );

  return {
    value: {
      ...summary,
      total,
      done,
      missing: Math.max(0, total - done),
    },
    changed: true,
  };
}

// ─── useContracts ───────────────────────────────────────

export function useContracts(
  filters: ContractFilters,
  fallbackData?: {
    contracts: Contract[];
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
        contracts: Contract[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnMount: fallbackData ? false : undefined,
      dedupingInterval: 10_000,
      fallbackData,
    }
  );

  useEffect(() => {
    if (fallbackData) {
      void mutate(fallbackData, { revalidate: false });
    }
  }, [fallbackData, mutate]);

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
      revalidateOnMount: fallbackData ? false : undefined,
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
      revalidateOnMount: fallbackData ? false : undefined,
      keepPreviousData: true,
      fallbackData,
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
    payments: data?.payments ?? EMPTY_PAYMENTS,
    paymentPlans: data?.paymentPlans ?? EMPTY_PAYMENT_PLANS,
    reservations: data?.reservations ?? EMPTY_RESERVATIONS,
    printOrders: data?.printOrders ?? EMPTY_PRINT_ORDERS,
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
        events: ContractEvent[];
        checklists: ContractChecklist[];
        workTasks: WorkTask[];
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

// ─── useActiveEmployees ─────────────────────────────────
// Employees rarely change → cache for 2 minutes

export function useActiveEmployees() {
  const { data } = useSWR(
    "active-employees",
    async () => {
      const result = await getActiveEmployees();
      if (!result.success) return [];
      return result.data as ActiveEmployee[];
    },
    {
      dedupingInterval: 120_000,
      revalidateOnFocus: false,
    }
  );
  return (data || []) as ActiveEmployee[];
}

// ─── Revalidation Helpers (ref: mcoffe lib/swr.ts) ──────

/** Invalidate all contract-related SWR caches after mutation */
export async function revalidateContractCaches(contractId?: string) {
  await revalidateContractCachesSSOT(contractId);
}

/** Invalidate only contract list and stats caches. Use for list-page realtime. */
export async function revalidateContractListCaches() {
  await Promise.all([
    mutate((key: unknown) => {
      if (!Array.isArray(key)) return false;
      return key[0] === "contracts";
    }, undefined, { revalidate: true }),
    mutate(contractKeys.stats()),
  ]);
}

export function updateContractListChecklistCache(
  contractId: string,
  checklistId: string,
  isCompleted: boolean,
) {
  // Keep all client-side contract views in sync without a network refetch.
  void mutate(
    (key: unknown) => Array.isArray(key) && key[0] === "contracts",
    (currentData: unknown) => {
      if (!currentData || typeof currentData !== "object") return currentData;

      const current = currentData as ContractListCache;
      if (!Array.isArray(current.contracts)) return currentData;

      let didChange = false;
      const contracts = current.contracts.map((contract) => {
        if (contract.id !== contractId) return contract;

        const nextChecklists = updateChecklistArray(
          contract.contract_checklists,
          checklistId,
          isCompleted,
        );
        const nextSummary = updateChecklistSummary(
          contract.checklist_summary,
          nextChecklists.previousCompleted,
          isCompleted,
        );
        if (!nextChecklists.changed && !nextSummary.changed) return contract;

        didChange = true;
        return {
          ...contract,
          ...(nextChecklists.changed
            ? { contract_checklists: nextChecklists.value }
            : {}),
          ...(nextSummary.changed ? { checklist_summary: nextSummary.value } : {}),
        };
      });

      return didChange ? { ...current, contracts } : currentData;
    },
    { revalidate: false },
  );

  void mutate(
    contractKeys.drawerExtra(contractId),
    (currentData: unknown) => {
      if (!currentData || typeof currentData !== "object") return currentData;

      const current = currentData as ContractDrawerExtraCache;
      const nextChecklists = updateChecklistArray(
        current.checklists,
        checklistId,
        isCompleted,
      );

      return nextChecklists.changed
        ? { ...current, checklists: nextChecklists.value }
        : currentData;
    },
    { revalidate: false },
  );

  void mutate(
    contractKeys.detail(contractId),
    (currentData: unknown) => {
      if (!currentData || typeof currentData !== "object") return currentData;

      const current = currentData as Partial<ContractDetailData>;
      if (!current.contract) return currentData;

      const nextChecklists = updateChecklistArray(
        current.contract.contract_checklists,
        checklistId,
        isCompleted,
      );

      return nextChecklists.changed
        ? {
            ...current,
            contract: {
              ...current.contract,
              contract_checklists: nextChecklists.value as Contract["contract_checklists"],
            },
          }
        : currentData;
    },
    { revalidate: false },
  );
}

/** Revalidate only the detail-side caches. Use for detail page realtime to avoid list/stat refresh storms. */
export async function revalidateContractDetailCaches(contractId: string) {
  await revalidateContractDetailCachesSSOT(contractId);
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
