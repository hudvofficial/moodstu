"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mutate } from "swr";
import type { Arguments } from "swr";
import { getEmployeeList } from "@/app/actions/employee-queries";
import { getServices } from "@/app/actions/service-queries";
import { cacheKeys } from "@/lib/swr";
import { createClient } from "@/lib/supabase/client";
import { DRESS_PAGE_SIZE } from "@/types/dress-constants";

type PrefetchConfig = {
  key: Arguments;
  fetcher: () => Promise<unknown>;
};

const CONTRACT_PAGE_SIZE = 20;
const EMPLOYEE_PAGE_SIZE = 20;
const SERVICE_PAGE_SIZE = 50;

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
};

const CONTRACT_LIST_KEY = [
  cacheKeys.contracts(),
  JSON.stringify(DEFAULT_CONTRACT_FILTERS),
] as const;

const DEFAULT_DRESS_FILTERS = {
  status: undefined,
  category: undefined,
  search: undefined,
  page: 1,
  sort: "newest",
};

const CONTRACT_PREFETCH_SELECT = `
  id, contract_code, customer_id, service_type,
  contract_date, work_date, delivery_date,
  total_amount, discount_amount, paid_amount,
  remaining_amount, status, payment_status,
  updated_at, created_at,
  customers (id, customer_code, full_name, phone, address, bride_name, groom_name),
  contract_checklists (
    id, contract_id, event_stage, category, item_name,
    is_completed, created_at, updated_at
  ),
  contract_notes (
    id, content, created_by, created_at
  ),
  contract_events (
    id, contract_id, event_type, title, event_date, deadline,
    sort_order, status, deleted_at
  ),
  work_tasks (
    id, contract_id, event_id, work_type, assigned_to, status,
    deadline, start_date, start_time, end_time, completion_date, cost, notes,
    employees:assigned_to(id, full_name, avatar_url, department)
  ),
  payment_plans (
    id, contract_id, stage_name, amount, due_date,
    status, receipt_id, created_at
  )
`;

const DRESS_PREFETCH_SELECT = `
  id, item_code, name, category, size, color, condition,
  rental_price, sale_price, purchase_price,
  current_stock, min_stock, image_url, status, notes,
  created_at, updated_at, created_by, updated_by, deleted_at
`;

function normalizeContractListRows(rows: Record<string, unknown>[]) {
  return rows.map((contract) => {
    const events = Array.isArray(contract.contract_events)
      ? (contract.contract_events as Record<string, unknown>[])
      : [];
    const paymentPlans = Array.isArray(contract.payment_plans)
      ? (contract.payment_plans as Record<string, unknown>[])
      : [];

    return {
      ...contract,
      contract_events: events
        .filter((event) => !event.deleted_at)
        .sort((a, b) => {
          const sortA = Number(a.sort_order) || 0;
          const sortB = Number(b.sort_order) || 0;
          if (sortA !== sortB) return sortA - sortB;
          return String(a.event_date || "").localeCompare(String(b.event_date || ""));
        }),
      payment_plans: paymentPlans.sort((a, b) =>
        String(a.created_at || "").localeCompare(String(b.created_at || "")),
      ),
    };
  });
}

function getPrefetchConfig(href: string): PrefetchConfig | null {
  const supabase = createClient();
  const route = href.split("?")[0];

  if (route === "/contracts") {
    return {
      key: CONTRACT_LIST_KEY,
      fetcher: async () => {
        const { data, error, count } = await supabase
          .from("contracts")
          .select(CONTRACT_PREFETCH_SELECT, { count: "estimated" })
          .is("deleted_at", null)
          .neq("status", "da_huy")
          .order("created_at", { ascending: false })
          .range(0, CONTRACT_PAGE_SIZE - 1);
        if (error) throw error;
        return {
          contracts: normalizeContractListRows((data || []) as Record<string, unknown>[]),
          total: count || 0,
          page: 1,
          pageSize: CONTRACT_PAGE_SIZE,
        };
      },
    };
  }

  if (route === "/services") {
    return {
      key: cacheKeys.services(),
      fetcher: async () => {
        const result = await getServices({ limit: SERVICE_PAGE_SIZE });
        if (!result.success) throw new Error(result.error);
        return result.data ?? { items: [], total: 0, page: 1, limit: SERVICE_PAGE_SIZE };
      },
    };
  }

  if (route === "/employees") {
    return {
      key: [cacheKeys.employees(), "", "", "", "", "", "1"],
      fetcher: async () => {
        const result = await getEmployeeList({ pageSize: EMPLOYEE_PAGE_SIZE });
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
    };
  }

  if (route === "/dresses") {
    return {
      key: [cacheKeys.dresses(), DEFAULT_DRESS_FILTERS],
      fetcher: async () => {
        const { data, error, count } = await supabase
          .from("dresses")
          .select(DRESS_PREFETCH_SELECT, { count: "exact" })
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .range(0, DRESS_PAGE_SIZE - 1);
        if (error) throw error;
        return {
          data: data ?? [],
          count: count || 0,
        };
      },
    };
  }

  return null;
}

export function usePrefetchOnHover() {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());

  return useCallback(
    (href: string) => {
      const route = href.split("?")[0];
      if (!route || pathname === route || pathname.startsWith(`${route}/`)) return;

      router.prefetch(route);
      if (prefetchedRef.current.has(route)) return;

      const config = getPrefetchConfig(route);
      if (!config) return;

      prefetchedRef.current.add(route);
      void mutate(config.key, config.fetcher(), { revalidate: false }).catch(() => {
        prefetchedRef.current.delete(route);
      });
    },
    [pathname, router],
  );
}
