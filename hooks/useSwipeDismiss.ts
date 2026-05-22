"use client";

import { useState, useRef, useCallback, type CSSProperties } from "react";
import { haptic } from "@/lib/haptic";

const DISMISS_THRESHOLD = 100;    // px
const VELOCITY_THRESHOLD = 0.5;  // px/ms

interface SwipeState {
  startY: number;
  startTime: number;
  active: boolean;
}

interface UseSwipeDismissResult {
  swipeY: number;
  isSwiping: boolean;
  swipeStyle: CSSProperties;
  backdropOpacity: number | undefined;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * useSwipeDismiss — Swipe-to-dismiss cho bottom sheet modal
 * Chỉ track vuốt XUỐNG (deltaY > 0)
 * Dismiss nếu: distance > 100px HOẶC velocity > 0.5px/ms
 * Snap-back nếu không đủ threshold
 */
export function useSwipeDismiss(onDismiss: () => void): UseSwipeDismissResult {
  const [swipeY, setSwipeY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeRef = useRef<SwipeState>({ startY: 0, startTime: 0, active: false });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    swipeRef.current = {
      startY: e.touches[0].clientY,
      startTime: Date.now(),
      active: true,
    };
    setIsSwiping(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current.active) return;
    const deltaY = e.touches[0].clientY - swipeRef.current.startY;
    if (deltaY > 0) {
      setSwipeY(deltaY);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!swipeRef.current.active) return;
    swipeRef.current.active = false;

    const elapsed = Date.now() - swipeRef.current.startTime;
    const velocity = elapsed > 0 ? swipeY / elapsed : 0;

    if (swipeY >= DISMISS_THRESHOLD || velocity >= VELOCITY_THRESHOLD) {
      haptic("light");
      onDismiss();
    } else {
      // Snap back
      setSwipeY(0);
    }
    setIsSwiping(false);
  }, [swipeY, onDismiss]);

  const swipeStyle: CSSProperties = isSwiping
    ? { transform: `translateY(${swipeY}px)`, transition: "none" }
    : swipeY > 0
      ? { transform: "translateY(0)", transition: "transform 0.25s ease-out" }
      : {};

  const backdropOpacity = isSwiping
    ? Math.max(0.1, 1 - swipeY / 400)
    : undefined;

  return {
    swipeY,
    isSwiping,
    swipeStyle,
    backdropOpacity,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
