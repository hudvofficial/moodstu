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
}

export function PullToRefreshProvider({ children, scrollRef, disabled }: PullToRefreshProviderProps) {
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
      </div>
    </PullToRefreshContext.Provider>
  );
}

export function usePullToRefreshCallback(callback: () => Promise<void>, deps: unknown[] = []) {
  const context = useContext(PullToRefreshContext);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
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
