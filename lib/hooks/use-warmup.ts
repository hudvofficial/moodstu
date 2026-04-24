"use client";

import { useEffect } from "react";
import { usePrefetchOnHover } from "@/lib/hooks/use-prefetch-on-hover";

export function useWarmup() {
  const prefetch = usePrefetchOnHover();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      prefetch("/contracts");
      prefetch("/dresses");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [prefetch]);
}
