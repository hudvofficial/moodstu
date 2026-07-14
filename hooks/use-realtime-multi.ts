"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeRealtimePayload,
  type ConnectionStatus,
  type RealtimePayload,
} from "@/hooks/use-realtime";

export type { RealtimePayload };

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
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    configs.length > 0 ? "connecting" : "disconnected",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payloadQueueRef = useRef<RealtimePayload[]>([]);
  const onChangeRef = useRef<RealtimeMultiOptions["onChange"]>(options.onChange);
  const onBatchChangeRef = useRef<RealtimeMultiOptions["onBatchChange"]>(
    options.onBatchChange,
  );
  const configsKey = useMemo(() => configKey(configs), [configs]);
  const channelName = options.channelName || `realtime-multi-${configsKey}`;
  const debounceMs = options.debounceMs ?? 300;

  useEffect(() => {
    onChangeRef.current = options.onChange;
    onBatchChangeRef.current = options.onBatchChange;
  }, [options.onBatchChange, options.onChange]);

  useEffect(() => {
    // Skip empty config: subscribing a channel with zero postgres_changes handlers is
    // pointless AND harmful — Supabase dedupes channels by topic, so when configs later
    // go []→[...] the re-created channel resolves to the already-subscribed empty one,
    // and adding .on() after subscribe() throws "cannot add postgres_changes callbacks
    // after subscribe()". Not subscribing until there are configs avoids that race.
    if (configs.length === 0) {
      return;
    }

    // cancelled: setup() là async (await getSession) — remount nhanh (StrictMode,
    // list↔detail) làm cleanup chạy lúc channel còn null, setup cũ vẫn tiếp tục tạo
    // + subscribe channel; setup mới xin channel CÙNG topic nhận lại instance đã
    // subscribe → .on() ném "cannot add postgres_changes after subscribe()".
    // Check cancelled sau await → setup cũ dừng trước khi tạo channel mồ côi.
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setStatus((prev) => (prev === "disconnected" ? prev : "disconnected"));
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

      const handler = (rawPayload: RealtimePayload) => {
        const payload = normalizeRealtimePayload(rawPayload);
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
          setStatus((prev) => (prev === "connected" ? prev : "connected"));
        } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          setStatus((prev) => (prev === "retrying" ? prev : "retrying"));
        } else if (channelStatus === "CLOSED") {
          setStatus((prev) => (prev === "disconnected" ? prev : "disconnected"));
        }
      });
    };

    // Race còn sót (vd subscribe đúng lúc client teardown) → retry thay vì
    // unhandledRejection làm bẩn Sentry/dev overlay.
    setup().catch(() => setStatus("retrying"));

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      payloadQueueRef.current = [];
      if (channel) supabase.removeChannel(channel);
      setStatus((prev) => (prev === "disconnected" ? prev : "disconnected"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, configsKey, debounceMs]);

  return { status: configs.length === 0 ? "disconnected" : status };
}
