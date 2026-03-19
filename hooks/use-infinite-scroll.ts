"use client";

import { useCallback, useRef, useEffect } from "react";

/**
 * Infinite scroll hook — triggers `onLoadMore` when user scrolls near bottom.
 * Source: Coffee hooks/useInfiniteScroll.ts (38 lines)
 * Returns a ref to attach to the sentinel element.
 *
 * @example
 * const sentinelRef = useInfiniteScroll(loadMore, hasMore);
 * return <div ref={sentinelRef} /> // Place at bottom of list
 */
export function useInfiniteScroll(onLoadMore: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && enabled) {
        onLoadMore();
      }
    },
    [onLoadMore, enabled]
  );

  useEffect(() => {
    observerRef.current?.disconnect();

    if (!enabled || !sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });

    observerRef.current.observe(sentinelRef.current);

    return () => observerRef.current?.disconnect();
  }, [handleIntersect, enabled]);

  return sentinelRef;
}
