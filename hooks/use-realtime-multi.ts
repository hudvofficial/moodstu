"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  onChange?: (payload: RealtimePayload) => void | Promise<void>;
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
  options: RealtimeMultiOptions = {},
) {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef<RealtimeMultiOptions["onChange"]>(undefined);
  const configsKey = useMemo(() => configKey(configs), [configs]);
  const channelName = options.channelName || `realtime-multi-${configsKey}`;
  const debounceMs = options.debounceMs ?? 300;

  onChangeRef.current = options.onChange;

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

      const handler = (payload: RealtimePayload) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          if (onChangeRef.current) {
            void onChangeRef.current(payload);
            return;
          }
          router.refresh();
        }, debounceMs);
      };

      for (const config of configs) {
        const eventTypes = config.eventTypes?.length
          ? config.eventTypes
          : ["INSERT", "UPDATE", "DELETE"];

        for (const event of eventTypes) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (channel) supabase.removeChannel(channel);
      setStatus("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, configsKey, debounceMs]);

  return { status };
}
