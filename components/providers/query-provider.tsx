"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

/**
 * React Query Provider for Gallery Management
 *
 * Configuration optimized for 2026 best practices:
 * - 5min staleTime: Prevents unnecessary refetches on navigation
 * - 10min gcTime: Keeps data in cache for quick revisits
 * - No refetch on window focus: Prevents jarring UX
 * - Smart retry logic: Only retry on network errors
 */

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_GC_TIME = 10 * 60 * 1000; // 10 minutes

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes before considering it stale
        staleTime: DEFAULT_STALE_TIME,

        // Keep unused data in cache for 10 minutes
        gcTime: DEFAULT_GC_TIME,

        // Don't refetch on window focus (prevents jarring UX)
        refetchOnWindowFocus: false,

        // Don't refetch on mount if data is fresh
        refetchOnMount: false,

        // Retry failed requests intelligently
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && 'status' in error) {
            const status = (error as any).status;
            if (status >= 400 && status < 500) return false;
          }
          // Retry network errors up to 2 times
          return failureCount < 2;
        },

        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },

      mutations: {
        // Don't retry mutations by default (prevent duplicate actions)
        retry: false,

        // Network mode for mutations
        networkMode: "online",
      },
    },
  });
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient in state to avoid re-creation on re-renders
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show devtools in development only */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
