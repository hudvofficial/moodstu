import type { UseQueryOptions } from "@tanstack/react-query";

export const globalQueryDefaults = {
  retry: 1,
  refetchOnWindowFocus: true,
  networkMode: "offlineFirst" as const,
} satisfies Partial<UseQueryOptions>;

export const queryProfiles = {
  contracts: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  },
  dashboard: {
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 15_000,
  },
  customers: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
  reference: {
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  },
} as const;

export type QueryDomain = keyof typeof queryProfiles;

export function createQueryOptions(domain: QueryDomain, overrides?: Record<string, unknown>) {
  return {
    ...globalQueryDefaults,
    ...queryProfiles[domain],
    ...overrides,
  };
}
