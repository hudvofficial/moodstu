"use client";

import { useTransition, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { UserPlus, Users, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Pagination } from "@/components/ui/pagination";
import { FAB } from "@/components/ui/fab";
import { EmptyState } from "@/components/ui/ux-states";
import CustomerStatsBar from "./customer-stats-bar";
import CustomerFilters from "./customer-filters";
import CustomerCompactCard from "./customer-compact-card";
import { CrmDashboardLayout } from "./crm-dashboard-layout";
import { WidgetCTA } from "./widgets/widget-cta";
import { WidgetUpcoming } from "./widgets/widget-upcoming";
import CustomerCard from "./customer-card";
import CustomerFormModal from "@/components/crm/customer-form-modal";
import CustomerDetailDrawer from "./customer-detail-drawer";
import type { Customer, CustomerStats } from "@/types/crm";

// ═══════════════════════════════════════════
// CustomerListPage — Gold Standard Rewrite
// Pattern: printing-list-page.tsx + lead-list-page.tsx
// ═══════════════════════════════════════════

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

export default function CustomerListPage({ initialData, stats }: CustomerListPageProps) {
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
    [router, pathname, searchParams]
  );

  const handleOpenCreate = () => {
    setIsModalOpen(true);
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  // Detect active filters
  const hasFilters = searchParams.get("search") || searchParams.get("source") || searchParams.get("tags");

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const widgetsContent = (
    <>
      <WidgetCTA />
      <WidgetUpcoming />
    </>
  );

  return (
    <>
      <div className="main-container gap-3!">
        {/* ── Mobile Sub-nav ── */}
      <div className="lg:hidden flex items-center gap-2 px-1">
        <Link href="/crm/leads"
          className="flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors text-text-secondary hover:bg-bg-hover"
        >
          DS Sale
        </Link>
        <Link href="/crm/customers"
          className="flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors bg-primary/10 text-primary"
        >
          Hồ sơ KH
        </Link>
      </div>

      {/* ── Hàng 1: Sub-tabs + Stats + Button ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        {/* Sub-module tabs (desktop) */}
        <div className="hidden lg:flex items-center gap-1 mr-4 shrink-0">
          <Link href="/crm/leads" className="px-3 py-1.5 text-sm font-medium rounded-lg text-text-secondary hover:bg-bg-hover transition-colors">
            DS Sale
          </Link>
          <Link href="/crm/customers" className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/10 text-primary">
            Hồ sơ KH
          </Link>
        </div>
        <div className="hidden lg:block w-px h-6 bg-text-muted/20 shrink-0" />
        <CustomerStatsBar stats={stats} compact={isMobile} />
        <div className="hidden lg:flex items-center gap-2">
          <Button onClick={handleOpenCreate} variant="primary" className="gap-2 shrink-0">
            <UserPlus className="w-4 h-4" />
            <span>Thêm KH</span>
          </Button>
        </div>
      </div>

      {/* FAB mobile */}
      <FAB onClick={handleOpenCreate} label="Thêm KH" />

      {/* ── Hàng 2: Filters ── */}
      <CustomerFilters />

      {/* ── Data — responsive ── */}
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
            <div className={`${isPending ? "opacity-50 pointer-events-none" : "opacity-100"} transition-opacity duration-200`}>
              {/* Desktop Cards */}
              <div className="hidden lg:flex flex-col gap-2">
                {initialData.customers.map((customer) => (
                  <CustomerCompactCard key={customer.id} customer={customer} onClick={handleRowClick} />
                ))}
              </div>
              {/* Mobile Cards */}
              <div className="lg:hidden space-y-2">
                {initialData.customers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onClick={handleRowClick}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 pointer-events-auto">
              <Pagination page={currentPage} totalPages={totalPages} onChange={handlePageChange} />
            </div>
            <p className="text-center text-xs text-text-muted mt-1">
              Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, initialData.total)} của {initialData.total} khách hàng
            </p>
          </div>
        </CrmDashboardLayout>
      )}
      </div>

      {/* ── Modals & Drawers ── */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <CustomerDetailDrawer
        customerId={selectedCustomer?.id || null}
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
        initialData={
          selectedCustomer
            ? { customer: selectedCustomer, contracts: [], lifetimeValue: 0 }
            : undefined
        }
      />
    </>
  );
}
