"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConnectionStatus, RealtimePayload } from "@/hooks/use-realtime";

export type RealtimeMultiConfig = {
  table: string;
  filter?: string;
  eventTypes?: ("INSERT" | "UPDATE" | "DELETE" | "*")[];
  schema?: string;
};

export type RealtimeMultiOptions = {
  channelName?: string;
  debounceMs?: number;
  onChange: (payload: RealtimePayload) => void | Promise<void>;
  onBatchChange?: (payloads: RealtimePayload[]) => void | Promise<void>;
};

function configKey(configs: RealtimeMultiConfig[]) {
  return configs
    .map((config) =>
      [
        config.schema || "public",
        config.table,
        config.filter || "",
        (config.eventTypes || ["INSERT", "UPDATE", "DELETE"]).join(","),
      ].join(":"),
    )
    .join("|");
}

export function useRealtimeMulti(
  configs: RealtimeMultiConfig[],
  options: RealtimeMultiOptions,
) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payloadQueueRef = useRef<RealtimePayload[]>([]);
  const onChangeRef = useRef<RealtimeMultiOptions["onChange"]>(options.onChange);
  const onBatchChangeRef = useRef<RealtimeMultiOptions["onBatchChange"]>(
    options.onBatchChange,
  );
  const configsKey = useMemo(() => configKey(configs), [configs]);
  const channelName = options.channelName || `realtime-multi-${configsKey}`;
  const debounceMs = options.debounceMs ?? 300;

  onChangeRef.current = options.onChange;
  onBatchChangeRef.current = options.onBatchChange;

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();

    setStatus("connecting");

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStatus("disconnected");
        return;
      }

      channel = supabase.channel(channelName);

      const flushPayloads = () => {
        const payloads = payloadQueueRef.current;
        payloadQueueRef.current = [];
        if (payloads.length === 0) return;

        if (onBatchChangeRef.current) {
          void onBatchChangeRef.current(payloads);
          return;
        }

        void (async () => {
          for (const payload of payloads) {
            await onChangeRef.current(payload);
          }
        })();
      };

      const handler = (payload: RealtimePayload) => {
        payloadQueueRef.current.push(payload);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(flushPayloads, debounceMs);
      };

      for (const config of configs) {
        const eventTypes = config.eventTypes?.length
          ? config.eventTypes
          : ["INSERT", "UPDATE", "DELETE"];

        for (const event of eventTypes) {
           
          (channel as any).on(
            "postgres_changes",
            {
              event,
              schema: config.schema || "public",
              table: config.table,
              filter: config.filter,
            },
            handler,
          );
        }
      }

      channel.subscribe((channelStatus: string) => {
        if (channelStatus === "SUBSCRIBED") {
          setStatus("connected");
        } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          setStatus("retrying");
        } else if (channelStatus === "CLOSED") {
          setStatus("disconnected");
        }
      });
    };

    setup();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      payloadQueueRef.current = [];
      if (channel) supabase.removeChannel(channel);
      setStatus("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, configsKey, debounceMs]);

  return { status };
}
