/**
 * Prefetch Contract Detail Data
 *
 * Prefetches contract detail data on hover/viewport to improve perceived performance.
 * Data is cached in React Query, so when user clicks, it loads instantly from cache.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Prefetch contract detail data
 *
 * Usage:
 * ```tsx
 * const prefetchContract = usePrefetchContract();
 *
 * <Link
 *   href={`/contracts/${id}`}
 *   onMouseEnter={() => prefetchContract(id)}
 * >
 *   Chi tiết
 * </Link>
 * ```
 */
export function usePrefetchContract() {
  const queryClient = useQueryClient();

  const prefetchContract = useCallback(
    async (contractId: string) => {
      if (!contractId) return;

      // Prefetch contract detail
      await queryClient.prefetchQuery({
        queryKey: ['contract-detail', contractId],
        queryFn: async () => {
          const response = await fetch(`/api/contracts/${contractId}/prefetch`, {
            method: 'GET',
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to prefetch contract');
          }

          return response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },
    [queryClient]
  );

  return prefetchContract;
}

/**
 * Prefetch on viewport entry (for lists)
 *
 * Usage:
 * ```tsx
 * const { ref } = usePrefetchOnView(contractId);
 *
 * <div ref={ref}>
 *   <Link href={`/contracts/${id}`}>Chi tiết</Link>
 * </div>
 * ```
 */
export function usePrefetchOnView(contractId: string) {
  const prefetchContract = usePrefetchContract();

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          prefetchContract(contractId);
        }
      });
    },
    [contractId, prefetchContract]
  );

  // Simple ref callback (no IntersectionObserver dependency for now)
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;

      const observer = new IntersectionObserver(handleIntersect, {
        rootMargin: '50px',
      });

      observer.observe(node);

      return () => observer.disconnect();
    },
    [handleIntersect]
  );

  return { ref };
}
