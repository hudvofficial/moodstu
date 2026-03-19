"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to subscribe to realtime changes on a specific table
 */
export function useRealtime(
  table: string,
  onUpdate: () => void,
  filter?: string
) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime_${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: filter,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate, filter, supabase]);
}
