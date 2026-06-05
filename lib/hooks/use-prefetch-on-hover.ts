"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIsSlowNetwork } from "@/hooks/use-network-quality";
import { mutate } from "swr";
import type { Arguments } from "swr";
import { getContractList } from "@/app/actions/contract-queries";
import { getEmployeeList } from "@/app/actions/employee-queries";
import { getServices } from "@/app/actions/service-queries";
import { getLeadsBootstrap } from "@/app/actions/lead-actions";
import { getCustomers, getCustomerStats } from "@/app/actions/customer-actions";
import { fetchCalendarEvents, fetchCalendarFilterEmployees, checkGoogleCalendarStatus } from "@/app/actions/calendar-queries";
import { getPrintingBootstrap } from "@/app/actions/printing-queries";
import { cacheKeys } from "@/lib/swr";
import { createClient } from "@/lib/supabase/client";
import type { ContractFilters } from "@/types/contract";
import { DRESS_PAGE_SIZE } from "@/types/dress-constants";

type PrefetchConfig = {
  key: Arguments;
  fetcher: () => Promise<unknown>;
};

const EMPLOYEE_PAGE_SIZE = 20;
const SERVICE_PAGE_SIZE = 50;

const DEFAULT_CONTRACT_FILTERS: ContractFilters = {
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

const DRESS_PREFETCH_SELECT = `
  id, item_code, name, category, size, color, condition,
  rental_price, sale_price, purchase_price,
  current_stock, min_stock, image_url, status, notes,
  created_at, updated_at, created_by, updated_by, deleted_at
`;

function getPrefetchConfig(href: string): PrefetchConfig | PrefetchConfig[] | null {
  const supabase = createClient();
  const route = href.split("?")[0];

  if (route === "/contracts") {
    return {
      key: CONTRACT_LIST_KEY,
      fetcher: async () => {
        const result = await getContractList(DEFAULT_CONTRACT_FILTERS);
        if (!result.success) throw new Error(result.error);
        return result.data;
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

  if (route === "/printing") {
    return {
      key: [cacheKeys.printingOrders(), {}],
      fetcher: async () => {
        const result = await getPrintingBootstrap();
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
    };
  }

  if (route === "/dashboard") {
    // Dashboard prefetch handled by useDashboardPrefetch hook
    // Skip SWR prefetch here to avoid circular dependency
    return null;
  }

  if (route === "/crm/leads") {
    // Key + payload phải khớp bootstrapQuery trong lead-list-page.tsx (list + stats
    // chung 1 entry) để hover→mở trang là cache-hit, không gọi lại server.
    return [
      {
        key: [cacheKeys.leads(), "", "", "", "", "1", "50"],
        fetcher: async () => {
          const result = await getLeadsBootstrap({ page: 1, pageSize: 50 });
          if (!result.success) throw new Error(result.error);
          return {
            leads: result.data.leads,
            total: result.data.total,
            page: result.data.page,
            pageSize: result.data.pageSize,
            stats: result.data.stats,
          };
        },
      },
    ];
  }

  if (route === "/crm/customers") {
    return [
      {
        key: [cacheKeys.customers(), "", "", "", "1", "10"],
        fetcher: async () => {
          const result = await getCustomers({ page: 1, pageSize: 10 });
          if (!result.success) throw new Error(result.error);
          return {
            customers: result.data.customers,
            total: result.data.total,
            totalPages: result.data.totalPages,
            page: result.data.page,
            pageSize: result.data.pageSize,
          };
        },
      },
      {
        key: `${cacheKeys.customers()}:stats`,
        fetcher: async () => {
          const result = await getCustomerStats();
          if (!result.success) throw new Error(result.error);
          return result.data;
        },
      }
    ];
  }

  if (route === "/calendar") {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    return [
      {
        key: cacheKeys.calendar(month, year),
        fetcher: async () => {
          const result = await fetchCalendarEvents(month, year);
          if (!result.success) throw new Error(result.error);
          return result.data;
        },
      },
      {
        key: "calendar-filter-employees",
        fetcher: async () => {
          const result = await fetchCalendarFilterEmployees();
          if (!result.success) throw new Error(result.error);
          return result.data;
        },
      },
      {
        key: "calendar-google-connected",
        fetcher: async () => {
          const result = await checkGoogleCalendarStatus();
          return result.success ? result.data : false;
        },
      }
    ];
  }

  return null;
}

export function usePrefetchOnHover() {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const isSlowNetwork = useIsSlowNetwork();

  return useCallback(
    (href: string) => {
      const route = href.split("?")[0];
      if (!route || pathname === route || pathname.startsWith(`${route}/`)) return;

      // Skip prefetch on slow networks to save bandwidth
      if (isSlowNetwork) return;

      router.prefetch(route);
      if (prefetchedRef.current.has(route)) return;

      const configOrConfigs = getPrefetchConfig(route);
      if (!configOrConfigs) return;

      prefetchedRef.current.add(route);
      const configs = Array.isArray(configOrConfigs) ? configOrConfigs : [configOrConfigs];

      configs.forEach((config) => {
        void mutate(config.key, config.fetcher(), { revalidate: false }).catch(() => {
          prefetchedRef.current.delete(route);
        });
      });
    },
    [pathname, router, isSlowNetwork],
  );
}
