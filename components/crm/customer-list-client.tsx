"use client";

import { useCallback, useState, useTransition } from "react";
import { usePullToRefreshCallback } from "@/contexts/pull-to-refresh-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterX, UserPlus, Users } from "lucide-react";
import { getCustomers, getCustomerStats } from "@/app/actions/customer-actions";
import { cacheKeys, revalidateByPrefixes, useSWR } from "@/lib/swr";
import { useRealtime } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { FAB } from "@/components/ui/fab";
import { Pagination } from "@/components/ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Customer, CustomerStats } from "@/types/crm";
import { CrmDashboardLayout } from "./crm-dashboard-layout";
import CustomerStatsBar from "./customer-stats-bar";
import CustomerFilters from "./customer-filters";
import { CustomersTable } from "./customers-table";
import { CustomerDrawer } from "./customer-drawer";
import CustomerFormModal from "./customer-form-modal";
import { WidgetCTA } from "./widgets/widget-cta";
import { WidgetUpcoming } from "./widgets/widget-upcoming";
import { CrmSubnav } from "./crm-subnav";
import { CrmToolbarSurface } from "./crm-toolbar-surface";

interface CustomerListClientProps {
  initialData: {
    customers: Customer[];
    total: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };
  stats: CustomerStats;
}

export default function CustomerListClient({
  initialData,
  stats,
}: CustomerListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const search = searchParams.get("search") || undefined;
  const source = searchParams.get("source") || undefined;
  const tags = searchParams.get("tags") || undefined;
  const pageParam = Number(searchParams.get("page") || initialData.page || 1);

  const listQuery = useSWR(
    [
      cacheKeys.customers(),
      search || "",
      source || "",
      tags || "",
      String(pageParam),
      String(initialData.pageSize || 10),
    ],
    async () => {
      const result = await getCustomers({
        search,
        source,
        tags,
        page: pageParam,
        pageSize: initialData.pageSize || 10,
      });
      if (!result.success) throw new Error(result.error);
      return result.data as {
        customers: Customer[];
        total: number;
        totalPages: number;
        page: number;
        pageSize: number;
      };
    },
    { fallbackData: initialData },
  );

  const statsQuery = useSWR(
    `${cacheKeys.customers()}:stats`,
    async () => {
      const result = await getCustomerStats();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    { fallbackData: stats },
  );

  useRealtime("customers", {
    prefixes: cacheKeys.customers(),
    debounceMs: 600,
  });
  useRealtime("contracts", {
    prefixes: cacheKeys.customers(),
    debounceMs: 600,
  });

  const data = listQuery.data || initialData;
  const liveStats = statsQuery.data || stats;
  const currentPage = data.page;
  const totalPages = data.totalPages || 1;
  const pageSize = data.pageSize || 10;

  const selectedCustomer = data.customers.find(c => c.id === selectedCustomerId) || null;
  const editingCustomer = data.customers.find(c => c.id === editingCustomerId) || null;

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  const handleOpenCreate = () => {
    setEditingCustomerId(null);
    setIsModalOpen(true);
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
  };

  const handleEdit = (id: string) => {
    setEditingCustomerId(id);
    setIsModalOpen(true);
  };

  const hasFilters = Boolean(
    searchParams.get("search") ||
      searchParams.get("source") ||
      searchParams.get("tags"),
  );

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleDataChanged = useCallback(() => {
    startTransition(() => {
      void revalidateByPrefixes(cacheKeys.customers());
    });
  }, [startTransition]);

  // Pull-to-refresh
  usePullToRefreshCallback(async () => {
    await revalidateByPrefixes(cacheKeys.customers());
  }, []);

  const widgetsContent = (
    <>
      <WidgetCTA />
      <WidgetUpcoming />
    </>
  );

  return (
    <>
      <div className="main-container gap-3!">
        <CrmSubnav activeHref="/crm/customers" className="lg:hidden px-1" />

        <CrmToolbarSurface>
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <CrmSubnav
              activeHref="/crm/customers"
              className="hidden shrink-0 lg:flex"
            />
            <div className="hidden h-6 w-px shrink-0 bg-text-muted/20 lg:block" />
            <CustomerStatsBar stats={liveStats} compact={isMobile} />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Button
              type="button"
              onClick={handleOpenCreate}
              variant="primary"
              className="gap-2 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm KH</span>
            </Button>
          </div>
        </CrmToolbarSurface>

        <FAB onClick={handleOpenCreate} label="Thêm KH" />

        <CustomerFilters />

        {data.customers.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={FilterX}
              title="Không tìm thấy"
              description="Không có khách hàng nào khớp với bộ lọc."
              actionLabel="Xóa bộ lọc"
              onAction={clearFilters}
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Chưa có khách hàng"
              description="Hãy bắt đầu bằng việc thêm một khách hàng mới."
              actionLabel="Thêm khách hàng đầu tiên"
              onAction={handleOpenCreate}
            />
          )
        ) : (
          <CrmDashboardLayout view="list" widgets={widgetsContent}>
            <div className="flex flex-col gap-2">
              <div
                className={`transition-opacity duration-200 ${
                  isPending ? "pointer-events-none opacity-50" : "opacity-100"
                }`}
              >
                <CustomersTable
                  customers={data.customers}
                  onView={handleRowClick}
                  onEdit={handleEdit}
                />
              </div>
              <div className="mt-4 pointer-events-auto">
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={handlePageChange}
                />
              </div>
              <p className="mt-1 text-center text-xs text-text-muted">
                Hiển thị {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, data.total)} của{" "}
                {data.total} khách hàng
              </p>
            </div>
          </CrmDashboardLayout>
        )}
      </div>

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomerId(null);
        }}
        onSaved={handleDataChanged}
        customer={editingCustomer}
      />

      <CustomerDrawer
        customer={selectedCustomer}
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        onEdit={handleEdit}
      />
    </>
  );
}
