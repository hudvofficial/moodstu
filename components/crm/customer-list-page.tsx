"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterX, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { FAB } from "@/components/ui/fab";
import { Pagination } from "@/components/ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Customer, CustomerStats } from "@/types/crm";
import { CrmDashboardLayout } from "./crm-dashboard-layout";
import CustomerStatsBar from "./customer-stats-bar";
import CustomerFilters from "./customer-filters";
import CustomerCompactCard from "./customer-compact-card";
import CustomerCard from "./customer-card";
import CustomerDetailDrawer from "./customer-detail-drawer";
import CustomerFormModal from "./customer-form-modal";
import { WidgetCTA } from "./widgets/widget-cta";
import { WidgetUpcoming } from "./widgets/widget-upcoming";
import { CrmSubnav } from "./crm-subnav";
import { CrmToolbarSurface } from "./crm-toolbar-surface";

interface CustomerListPageProps {
  initialData: {
    customers: Customer[];
    total: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };
  stats: CustomerStats;
}

export default function CustomerListPage({
  initialData,
  stats,
}: CustomerListPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const currentPage = initialData.page;
  const totalPages = initialData.totalPages || 1;
  const pageSize = initialData.pageSize || 10;

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
    setIsModalOpen(true);
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
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
      router.refresh();
    });
  }, [router, startTransition]);

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
            <CustomerStatsBar stats={stats} compact={isMobile} />
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

        {initialData.customers.length === 0 ? (
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
                {isMobile ? (
                  <div className="space-y-2">
                    {initialData.customers.map((customer) => (
                      <CustomerCard
                        key={customer.id}
                        customer={customer}
                        onClick={handleRowClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {initialData.customers.map((customer) => (
                      <CustomerCompactCard
                        key={customer.id}
                        customer={customer}
                        onClick={handleRowClick}
                      />
                    ))}
                  </div>
                )}
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
                {Math.min(currentPage * pageSize, initialData.total)} của{" "}
                {initialData.total} khách hàng
              </p>
            </div>
          </CrmDashboardLayout>
        )}
      </div>

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleDataChanged}
      />

      <CustomerDetailDrawer
        customerId={selectedCustomer?.id || null}
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
        onChanged={handleDataChanged}
        initialData={
          selectedCustomer
            ? { customer: selectedCustomer, contracts: [], lifetimeValue: 0 }
            : undefined
        }
      />
    </>
  );
}
