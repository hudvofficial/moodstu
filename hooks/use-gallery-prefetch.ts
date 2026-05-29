"use client";

import { useEffect, useRef } from "react";
import { getGalleryImagesPaginated } from "@/app/actions/gallery-image-helpers";

// ═══════════════════════════════════════════
// Gallery Prefetch Hook - Aggressive prefetching like Google Photos
// Loads next page silently in background when user reaches 60% of current batch
// ═══════════════════════════════════════════

interface UsePrefetchGalleryOptions {
  enabled?: boolean;
  prefetchThreshold?: number; // 0-1, default 0.6 (60% scroll depth)
  debounceMs?: number;
}

export function usePrefetchGallery(
  galleryId: string | null,
  currentLoadedCount: number,
  totalCount: number,
  hasMore: boolean,
  pageSize: number,
  options: UsePrefetchGalleryOptions = {}
) {
  const {
    enabled = true,
    prefetchThreshold = 0.6,
    debounceMs = 1000,
  } = options;

  const prefetchedPages = useRef(new Set<number>());
  const prefetchTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPrefetching = useRef(false);

  useEffect(() => {
    // Reset prefetch cache when gallery changes
    prefetchedPages.current.clear();
  }, [galleryId]);

  useEffect(() => {
    if (!enabled || !galleryId || !hasMore || isPrefetching.current) return;

    // Calculate current page and next page
    const currentPage = Math.floor(currentLoadedCount / pageSize);
    const nextPage = currentPage + 1;

    // Already prefetched this page
    if (prefetchedPages.current.has(nextPage)) return;

    // Check if we should trigger prefetch (user has viewed prefetchThreshold% of loaded images)
    const scrollDepth = currentLoadedCount / totalCount;
    const shouldPrefetch = scrollDepth >= prefetchThreshold * ((currentPage + 1) * pageSize / totalCount);

    if (!shouldPrefetch) return;

    // Clear existing timer
    if (prefetchTimer.current) {
      clearTimeout(prefetchTimer.current);
    }

    // Debounced prefetch to avoid rapid-fire requests during fast scrolling
    prefetchTimer.current = setTimeout(() => {
      isPrefetching.current = true;
      prefetchedPages.current.add(nextPage);

      // Silent prefetch (no setState, just prime Supabase client cache)
      void getGalleryImagesPaginated(galleryId, nextPage, pageSize)
        .then((res) => {
          if (res.success) {
            console.log(`[Prefetch] Page ${nextPage} loaded silently (${res.data?.images.length || 0} images)`);
          }
        })
        .catch((err) => {
          console.warn("[Prefetch] Failed:", err);
          // Remove from prefetched set to allow retry
          prefetchedPages.current.delete(nextPage);
        })
        .finally(() => {
          isPrefetching.current = false;
        });
    }, debounceMs);

    return () => {
      if (prefetchTimer.current) {
        clearTimeout(prefetchTimer.current);
      }
    };
  }, [
    enabled,
    galleryId,
    currentLoadedCount,
    totalCount,
    hasMore,
    pageSize,
    prefetchThreshold,
    debounceMs,
  ]);

  return {
    prefetchedPages: Array.from(prefetchedPages.current),
    isPrefetching: isPrefetching.current,
  };
}
