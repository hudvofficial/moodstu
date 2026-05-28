/**
 * Singleton QueryClient instance for use in non-React contexts
 *
 * This is used by cache-invalidation.ts and other utility functions
 * that need to invalidate React Query caches outside of React components.
 *
 * IMPORTANT: Only use this in non-React contexts. Inside React components,
 * always use `useQueryClient()` hook instead.
 */

import { QueryClient } from "@tanstack/react-query";

let globalQueryClient: QueryClient | null = null;

export function getGlobalQueryClient(): QueryClient {
  if (!globalQueryClient) {
    // This should match the config in QueryProvider
    globalQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          retry: (failureCount, error) => {
            if (error instanceof Error && 'status' in error) {
              const status = (error as any).status;
              if (status >= 400 && status < 500) return false;
            }
            return failureCount < 2;
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
          retry: false,
          networkMode: "online",
        },
      },
    });
  }

  return globalQueryClient;
}

export function setGlobalQueryClient(client: QueryClient) {
  globalQueryClient = client;
}
