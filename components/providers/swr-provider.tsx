"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { swrConfig } from "@/lib/swr";
import { saveSWRCacheEntry, shouldPersistSWRKey } from "@/lib/swr-persist";
import { SWRPersistInit } from "@/components/providers/swr-persist-init";

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        ...swrConfig,
        onSuccess: (data, key, config) => {
          swrConfig.onSuccess?.(data, key, config);
          if (shouldPersistSWRKey(key)) {
            saveSWRCacheEntry(key, data);
          }
        },
      }}
    >
      <SWRPersistInit />
      {children}
    </SWRConfig>
  );
}
