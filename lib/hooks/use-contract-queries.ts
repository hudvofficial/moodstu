"use client";

/**
 * 📦 Contract React Query Hooks (V2)
 *
 * Client-side cache layer for contract data using React Query.
 * Pattern: React Query → Server Actions → Database
 *
 * Migration from SWR to React Query for:
 * - Better TypeScript support
 * - More predictable cache behavior
 * - Consistent with gallery module
 */

import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";
import type {
  ContractFilters,
  ContractStats,
  Contract,
  ContractStatus,
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

// ═══════════════════════════════════════════
// Query Keys Factory (Centralized key management)
// ═══════════════════════════════════════════

export const contractKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractKeys.all, "list"] as const,
  list: (filters: ContractFilters) => [...contractKeys.lists(), JSON.stringify(filters)] as const,
  stats: () => [...contractKeys.all, "stats"] as const,
  details: () => [...contractKeys.all, "detail"] as const,
  detail: (id: string) => [...contractKeys.details(), id] as const,
  drawerExtras: () => [...contractKeys.all, "drawer-extra"] as const,
  drawerExtra: (id: string) => [...contractKeys.drawerExtras(), id] as const,
  employees: () => ["active-employees"] as const,
};

// ═══════════════════════════════════════════
// Helper Types
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
// Query Hooks
// ═══════════════════════════════════════════

/**
 * Fetch contracts list with filters
 *
 * Features:
 * - 5min cache (no refetch on navigation)
 * - Optimistic updates from mutations
 * - SSR-friendly with initialData
 */
export function useContracts(
  filters: ContractFilters,
  initialData?: {
    contracts: Contract[];
    total: number;
    page: number;
    pageSize: number;
  },
) {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery({
    queryKey: contractKeys.list(filters),
    queryFn: async () => {
      const result = await getContractList(filters);
      if (!result.success) throw new Error(result.error);
      return result.data as {
        contracts: Contract[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while loading (like SWR keepPreviousData)
  });

  // Seed cache with initialData if provided (matches SWR behavior)
  useEffect(() => {
    if (initialData) {
      queryClient.setQueryData(contractKeys.list(filters), initialData);
    }
  }, [initialData, filters, queryClient]);

  return {
    contracts: data?.contracts || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    isLoading,
    error,
    mutate: () => queryClient.invalidateQueries({ queryKey: contractKeys.list(filters) }),
  };
}

/**
 * Fetch contract stats (dashboard summary)
 */
export function useContractStats(initialData?: ContractStats) {
  const { data, error, isLoading } = useQuery({
    queryKey: contractKeys.stats(),
    queryFn: async () => {
      const result = await getContractStats();
      if (!result.success) throw new Error(result.error);
      return result.data as ContractStats;
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes (stats change slowly)
    gcTime: 10 * 60 * 1000,
  });

  return {
    stats: data || null,
    isLoading,
    error,
    mutate: () => {}, // For compatibility with SWR API
  };
}

/**
 * Fetch full contract detail (for detail page)
 */
export type ContractDetailData = {
  contract: Contract;
  payments: Payment[];
  paymentPlans: PaymentPlan[];
  reservations: DressReservationRow[];
  printOrders: PrintingOrder[];
};

export function useContractDetail(
  id: string | null,
  initialData?: ContractDetailData,
) {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery({
    queryKey: id ? contractKeys.detail(id) : ["null"],
    queryFn: async () => {
      if (!id) return null;
      const result = await getContractDetail(id);
      if (!result.success) throw new Error(result.error);
      return result.data as unknown as ContractDetailData;
    },
    enabled: !!id,
    initialData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Seed cache with initialData if provided
  useEffect(() => {
    if (initialData && id) {
      queryClient.setQueryData(contractKeys.detail(id), initialData);
    }
  }, [initialData, id, queryClient]);

  return {
    contract: data?.contract || null,
    payments: data?.payments ?? EMPTY_PAYMENTS,
    paymentPlans: data?.paymentPlans ?? EMPTY_PAYMENT_PLANS,
    reservations: data?.reservations ?? EMPTY_RESERVATIONS,
    printOrders: data?.printOrders ?? EMPTY_PRINT_ORDERS,
    isLoading,
    error,
    mutate: () => id && queryClient.invalidateQueries({ queryKey: contractKeys.detail(id) }),
  };
}

/**
 * Fetch drawer extra data (lazy-loaded after drawer opens)
 *
 * Lightweight query (4 queries vs full detail's 6)
 */
export function useContractDrawerExtra(
  id: string | null,
  placeholderData?: {
    events: ContractEvent[];
    checklists: ContractChecklist[];
    workTasks: WorkTask[];
    paymentPlans: PaymentPlan[];
  },
) {
  const { data, error, isLoading } = useQuery({
    queryKey: id ? contractKeys.drawerExtra(id) : ["null"],
    queryFn: async () => {
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
    enabled: !!id,
    // Hiện NGAY từ list data (placeholder), fetch full ở nền rồi thay → KHÔNG skeleton (đúng "0ms drawer").
    placeholderData,
    staleTime: 5 * 60 * 1000,
  });

  return {
    events: data?.events || [],
    checklists: data?.checklists || [],
    workTasks: data?.workTasks || [],
    paymentPlans: data?.paymentPlans || [],
    isLoadingExtra: isLoading,
    error,
  };
}

/**
 * Fetch active employees (for assignment dropdowns)
 */
export function useActiveEmployees() {
  const { data } = useQuery({
    queryKey: contractKeys.employees(),
    queryFn: async () => {
      const result = await getActiveEmployees();
      if (!result.success) return [];
      return result.data as ActiveEmployee[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (employees rarely change)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return (data || []) as ActiveEmployee[];
}

// ═══════════════════════════════════════════
// Cache Invalidation Helpers
// ═══════════════════════════════════════════

/**
 * Invalidate all contract-related caches after mutation
 */
export function useContractInvalidation() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all contract caches */
    invalidateAll: async (contractId?: string) => {
      await queryClient.invalidateQueries({ queryKey: contractKeys.all });
      if (contractId) {
        await queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
        await queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(contractId) });
      }
    },

    /** Invalidate only list and stats (for realtime updates on list page) */
    invalidateList: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: contractKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: contractKeys.stats() }),
        queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtras() }),
      ]);
    },

    /** Invalidate only detail caches (for realtime on detail page) */
    invalidateDetail: async (contractId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) }),
        queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(contractId) }),
      ]);
    },
  };
}

/**
 * Standalone invalidation functions (for use outside React components)
 */
export async function revalidateContractCaches(queryClient: any, contractId?: string) {
  await queryClient.invalidateQueries({ queryKey: contractKeys.all });
  if (contractId) {
    await queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
    await queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(contractId) });
  }
}

export async function revalidateContractListCaches(queryClient: any) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: contractKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: contractKeys.stats() }),
    queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtras() }),
  ]);
}

export async function revalidateContractDetailCaches(queryClient: any, contractId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) }),
    queryClient.invalidateQueries({ queryKey: contractKeys.drawerExtra(contractId) }),
  ]);
}

// ═══════════════════════════════════════════
// Optimistic Update Helpers
// ═══════════════════════════════════════════

/**
 * Update contract status optimistically across all caches
 */
export function updateContractStatusCache(
  queryClient: any,
  contractId: string,
  newStatus: ContractStatus,
) {
  // Update contract list caches
  queryClient.setQueriesData(
    { queryKey: contractKeys.lists() },
    (currentData: unknown) => {
      if (!currentData || typeof currentData !== "object") return currentData;

      const current = currentData as ContractListCache;
      if (!Array.isArray(current.contracts)) return currentData;

      let didChange = false;
      const contracts = current.contracts.map((contract) => {
        if (contract.id !== contractId) return contract;
        if (contract.status === newStatus) return contract;

        didChange = true;
        return { ...contract, status: newStatus };
      });

      return didChange ? { ...current, contracts } : currentData;
    }
  );

  // Update contract detail cache
  queryClient.setQueryData(
    contractKeys.detail(contractId),
    (currentData: unknown) => {
      if (!currentData || typeof currentData !== "object") return currentData;

      const current = currentData as Partial<ContractDetailData>;
      if (!current.contract) return currentData;
      if (current.contract.status === newStatus) return currentData;

      return {
        ...current,
        contract: {
          ...current.contract,
          status: newStatus,
        },
      };
    }
  );
}

/**
 * Update checklist completion status optimistically across all caches
 */
export function updateContractListChecklistCache(
  queryClient: any,
  contractId: string,
  checklistId: string,
  isCompleted: boolean,
) {
  // Update contract list caches
  queryClient.setQueriesData(
    { queryKey: contractKeys.lists() },
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
    }
  );

  // Update drawer extra cache
  queryClient.setQueryData(
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
    }
  );

  // Update detail cache
  queryClient.setQueryData(
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
    }
  );
}

// ═══════════════════════════════════════════
// Prefetch Helpers
// ═══════════════════════════════════════════

const prefetchedDrawerExtras = new Set<string>();
const prefetchedContractDetails = new Set<string>();

/**
 * Pre-warm cache for drawer data (lightweight - 4 queries)
 */
export function prefetchContract(queryClient: any, id: string) {
  if (prefetchedDrawerExtras.has(id)) return;
  prefetchedDrawerExtras.add(id);

  queryClient.prefetchQuery({
    queryKey: contractKeys.drawerExtra(id),
    queryFn: async () => {
      const result = await getContractDrawerExtra(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  }).catch(() => {
    prefetchedDrawerExtras.delete(id);
  });
}

/**
 * Pre-warm cache for full contract detail (6 queries)
 */
export function prefetchContractDetail(queryClient: any, id: string) {
  if (prefetchedContractDetails.has(id)) return;
  prefetchedContractDetails.add(id);

  queryClient.prefetchQuery({
    queryKey: contractKeys.detail(id),
    queryFn: async () => {
      const result = await getContractDetail(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  }).catch(() => {
    prefetchedContractDetails.delete(id);
  });
}
