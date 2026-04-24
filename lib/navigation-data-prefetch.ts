"use client";

import { mutate, type Arguments } from "swr";
import type { ContractFilters } from "@/types/contract";

const prefetched = new Set<string>();

const DEFAULT_CONTRACT_FILTERS = {
  status: "all",
  search: "",
  time: "all",
  service: "all",
  sort: "newest",
  startDate: "",
  endDate: "",
  advanced: false,
  page: 1,
} satisfies ContractFilters;

function normalizeHref(href: string) {
  if (href === "/crm") return "/crm/leads";
  return href.split("?")[0] || href;
}

function warm(key: Arguments, promise: Promise<unknown>) {
  void promise
    .then((data) => {
      if (data !== undefined) {
        void mutate(key, data, { revalidate: false });
      }
    })
    .catch(() => undefined);
}

export function prewarmRouteData(href: string) {
  // Disabled: Triggering Server Actions on client hover causes network saturation.
  return;
}
