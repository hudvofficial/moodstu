"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullIndicator } from "@/components/ui/pull-indicator";

interface PullToRefreshContextValue {
  registerRefresh: (callback: () => Promise<void>) => void;
  unregisterRefresh: () => void;
  isRefreshing: boolean;
  pullDistance: number;
}

const PullToRefreshContext = createContext<PullToRefreshContextValue | null>(null);

interface PullToRefreshProviderProps {
  children: ReactNode;
  scrollRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  /**
   * When true, append a flex-child spacer after children so the scroll area
   * extends past the fixed bottom-nav on mobile. Required because main's
   * `padding-bottom` does NOT contribute to scrollHeight when the inner
   * flex-1/min-h-0 child has overflowing content (the page-wrapper case).
   * See memory: ios-safe-area-cream-seam.md (Bug #4).
   */
  bottomNavSpacer?: boolean;
}

export function PullToRefreshProvider({ children, scrollRef, disabled, bottomNavSpacer }: PullToRefreshProviderProps) {
  const [refreshCallback, setRefreshCallback] = useState<(() => Promise<void>) | null>(null);

  const handleRefresh = useCallback(async () => {
    if (refreshCallback) {
      await refreshCallback();
    }
  }, [refreshCallback]);

  const { pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
    disabled: disabled || !refreshCallback,
  });

  const registerRefresh = useCallback((callback: () => Promise<void>) => {
    setRefreshCallback(() => callback);
  }, []);

  const unregisterRefresh = useCallback(() => {
    setRefreshCallback(null);
  }, []);

  return (
    <PullToRefreshContext.Provider value={{ registerRefresh, unregisterRefresh, isRefreshing, pullDistance }}>
      <PullIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} progress={progress} />
      <div
        className="flex-1 flex flex-col min-h-0 w-full relative"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isRefreshing
            ? "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
            : pullDistance === 0
              ? "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" // Spring physics snap-back
              : "none",
          willChange: pullDistance > 0 ? "transform" : "auto",
        }}
      >
        {children}
        {bottomNavSpacer && (
          <div
            aria-hidden="true"
            className="shrink-0 lg:hidden"
            style={{
              // nav height ≈ pt-2 (8) + items (~50) + pb-safe (env) ≈ 58 + safe-area
              // Spacer = nav height + comfortable 1rem buffer = 1.5rem + nav-h + safe-area.
              height:
                "calc(var(--bottom-nav-h) + 1.5rem + max(0.5rem, env(safe-area-inset-bottom)))",
            }}
          />
        )}
      </div>
    </PullToRefreshContext.Provider>
  );
}

export function usePullToRefreshCallback(callback: () => Promise<void>, deps: unknown[] = []) {
  const context = useContext(PullToRefreshContext);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...deps]);

  useEffect(() => {
    if (!context) return;

    context.registerRefresh(() => callbackRef.current());

    return () => {
      context.unregisterRefresh();
    };
  }, [context]);

  return context?.isRefreshing ?? false;
}

export function useIsPullRefreshing() {
  const context = useContext(PullToRefreshContext);
  return context?.isRefreshing ?? false;
}

export function usePullDistance() {
  const context = useContext(PullToRefreshContext);
  return context?.pullDistance ?? 0;
}
