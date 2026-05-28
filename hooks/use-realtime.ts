"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { revalidate, revalidateByPrefixes, revalidateMultiple } from "@/lib/swr";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "retrying";

export type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export type RealtimeOptions = {
  /** Exact SWR cache keys to revalidate. Prefer keys/prefixes over route refresh. */
  cacheKeys?: string[] | ((payload: RealtimePayload) => string[] | undefined);
  prefixes?: string | string[] | ((payload: RealtimePayload) => string | string[] | undefined);
  eventTypes?: ("INSERT" | "UPDATE" | "DELETE" | "*")[];
  filter?: string;
  debounceMs?: number;
  schema?: string;
  channelName?: string;
  onChange?: (payload: RealtimePayload) => void | Promise<void>;
};

/**
 * 🔄 useRealtime — Supabase realtime hook (V2 SWR adapter)
 *
 * Source: V1 useRealtime.ts (147 lines)
 * Adapted: React Query → SWR (revalidate/revalidateMultiple)
 *
 * On postgres_changes -> revalidate SWR keys/prefixes, or refresh only as a last resort.
 * Features: auth check, debounce (300ms), filtered events, row-level filter
 */
export function useRealtime(
  tableName: string,
  cacheKeysOrOptions?: string[] | RealtimeOptions,
) {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef<RealtimeOptions["onChange"]>(undefined);
  const cacheKeysRef = useRef<RealtimeOptions["cacheKeys"]>(undefined);
  const prefixesRef = useRef<RealtimeOptions["prefixes"]>(undefined);

  const isOptions =
    cacheKeysOrOptions &&
    !Array.isArray(cacheKeysOrOptions) &&
    typeof cacheKeysOrOptions === "object";

  const options: RealtimeOptions = isOptions
    ? (cacheKeysOrOptions as RealtimeOptions)
    : {};

  // Backward compat: second arg as string array = cache keys
  const keys: RealtimeOptions["cacheKeys"] = isOptions
    ? options.cacheKeys
    : (cacheKeysOrOptions as string[] | undefined);

  const eventTypes = useMemo(() => {
    if (options.eventTypes && options.eventTypes.length > 0) {
      return options.eventTypes.includes("*")
        ? (["*"] as const)
        : options.eventTypes;
    }
    return ["INSERT", "UPDATE", "DELETE"] as const;
  }, [options.eventTypes]);

  const filter = options.filter;
  const debounceMs = options.debounceMs ?? 300;
  const schema = options.schema ?? "public";
  const channelName =
    options.channelName || `realtime-${tableName}${filter ? `-${filter}` : ""}`;

  const eventTypesKey = useMemo(() => eventTypes.join(","), [eventTypes]);

  onChangeRef.current = options.onChange;
  cacheKeysRef.current = keys;
  prefixesRef.current = options.prefixes;

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();

    setStatus("connecting");

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("disconnected");
        return;
      }

      channel = supabase.channel(channelName);

      const handler = (payload: RealtimePayload) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const currentKeys = cacheKeysRef.current;
          const targetKeys =
            typeof currentKeys === "function" ? currentKeys(payload) : currentKeys;
          const currentPrefixes = prefixesRef.current;
          const targetPrefixes =
            typeof currentPrefixes === "function" ? currentPrefixes(payload) : currentPrefixes;

          if (targetKeys && targetKeys.length > 0) {
            if (targetKeys.length === 1) {
              revalidate(targetKeys[0]);
            } else {
              revalidateMultiple(targetKeys);
            }
          } else if (targetPrefixes) {
            void revalidateByPrefixes(targetPrefixes);
          } else if (onChangeRef.current) {
            void onChangeRef.current(payload);
          } else {
            router.refresh();
          }
        }, debounceMs);
      };

      const eventsToBind = eventTypes.length > 0 ? eventTypes : ["*"];

      eventsToBind.forEach((event) => {
         
        (channel as any).on(
          "postgres_changes",
          { event, schema, table: tableName, filter },
          handler,
        );
      });

      channel.subscribe((channelStatus: string) => {
        if (channelStatus === "SUBSCRIBED") {
          setStatus("connected");
        } else if (channelStatus === "CHANNEL_ERROR") {
          setStatus("retrying");
        } else if (channelStatus === "TIMED_OUT") {
          setStatus("retrying");
        } else if (channelStatus === "CLOSED") {
          setStatus("disconnected");
        }
      });
    };

    setup();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channel) supabase.removeChannel(channel);
      setStatus("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, filter, schema, debounceMs, eventTypesKey, channelName]);

  return { status };
}
