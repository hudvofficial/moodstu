"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { loadSWRCacheEntries, requestPersistentStorage } from "@/lib/swr-persist";

export function SWRPersistInit() {
  useEffect(() => {
    let cancelled = false;

    void requestPersistentStorage();

    void loadSWRCacheEntries().then((cached) => {
      if (cancelled) return;
      cached.forEach((data, key) => {
        void mutate(key, data, { revalidate: false });
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
