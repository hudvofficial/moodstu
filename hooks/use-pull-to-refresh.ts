"use client";

import { useState, useRef, useCallback, useEffect, type RefObject } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptic";

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  scrollRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
}

interface UsePullToRefreshResult {
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
  progress: number;
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh({
  onRefresh,
  scrollRef,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const isMobile = useIsMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isActiveRef = useRef(false);
  const triggeredHapticRef = useRef(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || !isMobile || isRefreshing) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl || scrollEl.scrollTop > 0) return;

    startYRef.current = e.touches[0].clientY;
    isActiveRef.current = true;
    triggeredHapticRef.current = false;
    setIsPulling(true);
  }, [disabled, isMobile, isRefreshing, scrollRef]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isActiveRef.current || isRefreshing) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl || scrollEl.scrollTop > 0) {
      isActiveRef.current = false;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    const deltaY = e.touches[0].clientY - startYRef.current;

    if (deltaY > 0) {
      e.preventDefault();
      // iOS-style progressive resistance curve
      const resistance = deltaY < 60 ? 0.55 : deltaY < 100 ? 0.45 : 0.35;
      const distance = Math.min(deltaY * resistance, MAX_PULL);
      setPullDistance(distance);

      // Haptic feedback at threshold
      if (distance >= PULL_THRESHOLD && !triggeredHapticRef.current) {
        haptic("medium");
        triggeredHapticRef.current = true;
      }
      // Light haptic when starting pull
      else if (distance >= 10 && distance < 15 && !triggeredHapticRef.current) {
        haptic("light");
      }
    }
  }, [isRefreshing, scrollRef]);

  const onTouchEnd = useCallback(async () => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);

      try {
        await onRefresh();
        haptic("success");
      } catch {
        haptic("error");
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    setIsPulling(false);
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !isMobile || disabled) return;

    const handleTouchStart = (e: TouchEvent) => onTouchStart(e);
    const handleTouchMove = (e: TouchEvent) => onTouchMove(e);
    const handleTouchEnd = () => onTouchEnd();

    scrollEl.addEventListener("touchstart", handleTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      scrollEl.removeEventListener("touchstart", handleTouchStart);
      scrollEl.removeEventListener("touchmove", handleTouchMove);
      scrollEl.removeEventListener("touchend", handleTouchEnd);
    };
  }, [scrollRef, isMobile, disabled, onTouchStart, onTouchMove, onTouchEnd]);

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    progress: Math.min(pullDistance / PULL_THRESHOLD, 1),
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
