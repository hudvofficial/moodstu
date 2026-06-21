"use client";

import { useCallback, useState, useTransition } from "react";
import { usePullToRefreshCallback } from "@/contexts/pull-to-refresh-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterX, UserPlus, Users } from "lucide-react";
import { getCustomers, getCustomerStats, deleteCustomer } from "@/app/actions/customer-actions";
import { cacheKeys, mutateListCache, revalidateByPrefixes, useSWR } from "@/lib/swr";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
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
import CustomersLoading from "@/app/(protected)/crm/customers/loading";

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
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

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

  // Pagination range — clamp về total để tránh hiển thị "Hiển thị 21–30 của 5"
  // khi user ở page > totalPages do filter thay đổi mà page chưa reset.
  const displayStart = data.total > 0 ? Math.min((currentPage - 1) * pageSize + 1, data.total) : 0;
  const displayEnd = data.total > 0 ? Math.min(currentPage * pageSize, data.total) : 0;

  // Xác định trạng thái loading (chưa có data + đang fetch)
  const isDataLoading = listQuery.isLoading || (!listQuery.data && !listQuery.error && initialData.customers.length === 0);

  const selectedCustomer = data.customers.find(c => c.id === selectedCustomerId) || null;

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
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
  };

  // Nhận full customer object thay vì chỉ id → tránh mở modal ở CREATE mode
  // khi KH đang ở page khác (data.customers.find() trả null).
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
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

  const handleDelete = useCallback(
    (id: string) => {
      setDeletingCustomer(data.customers.find((c) => c.id === id) || null);
    },
    [data.customers],
  );

  const confirmDelete = useCallback(async () => {
    const target = deletingCustomer;
    if (!target) return;
    setDeletingCustomer(null);
    // DELETE: customer soft-delete (deleted_at) → mất hẳn khỏi list → optimistic-remove an toàn.
    await runOptimisticMutation({
      apply: () =>
        mutateListCache(cacheKeys.customers(), (cur) => {
          const list = cur as { customers?: Customer[]; total?: number } | undefined;
          return list?.customers
            ? {
                ...list,
                customers: list.customers.filter((c) => c.id !== target.id),
                total: Math.max(0, (list.total ?? 1) - 1),
              }
            : cur;
        }),
      rollback: () => {
        void revalidateByPrefixes(cacheKeys.customers());
      },
      action: () => deleteCustomer(target.id),
      onSuccess: () => {
        toast.success("Đã xóa khách hàng");
        handleDataChanged();
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Lỗi khi xóa khách hàng"),
    });
  }, [deletingCustomer, handleDataChanged]);

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
      {isDataLoading && data.customers.length === 0 ? (
        <>
          <div className="lg:hidden px-4 pt-2">
            <CrmSubnav activeHref="/crm/customers" />
          </div>
          <CustomersLoading />
        </>
      ) : (
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
                Hiển thị {displayStart}–
                {displayEnd} của{" "}
                {data.total} khách hàng
              </p>
            </div>
          </CrmDashboardLayout>
        )}
      </div>
      )}

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        onSaved={handleDataChanged}
        customer={editingCustomer}
      />

      <CustomerDrawer
        customer={selectedCustomer}
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={confirmDelete}
        title="Xóa khách hàng"
        message={`Bạn có chắc muốn xóa "${deletingCustomer?.full_name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
      />
    </>
  );
}
