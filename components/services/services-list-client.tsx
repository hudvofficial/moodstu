"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Package } from "lucide-react";
import { getServiceCategories, getServices } from "@/app/actions/service-queries";
import type { ServiceRecord, ServiceCategory } from "@/types/service";
import type { ViewMode } from "@/types/service-constants";
import { calculateServiceStats } from "@/lib/utils/service-utils";
import { cacheKeys, useSWR } from "@/lib/swr";
import ServiceStatsBar from "./service-stats-bar";
import ServiceFilters from "./service-filters";
import ServiceTable from "./service-table";
import ServiceMobileList from "./service-mobile-list";
import ServiceGrid from "./service-grid";
import { EmptyState } from "@/components/ui/ux-states";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { SkeletonTable } from "@/components/ui/skeleton";
import { CategoryManagerModal } from "./category-manager-modal";
import QuoteModal from "@/components/services/quote/quote-modal";

interface Props {
  initialServices?: ServiceRecord[];
  categories?: ServiceCategory[];
}

async function loadServices() {
  const result = await getServices({ limit: 50 });
  if (!result.success) throw new Error(result.error);
  return result.data?.items || [];
}

async function loadCategories() {
  const result = await getServiceCategories();
  if (!result.success) throw new Error(result.error);
  return result.data || [];
}

export default function ServicesListClient({
  initialServices,
  categories,
}: Props) {
  // ── State ──────────────────────────────────
  const router = useRouter();

  const [categoryId, setCategoryId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [quoteService, setQuoteService] = useState<ServiceRecord | null>(null);
  const servicesQuery = useSWR(
    cacheKeys.services(),
    loadServices,
    initialServices ? { fallbackData: initialServices } : undefined,
  );
  const categoriesQuery = useSWR(
    cacheKeys.categories(),
    loadCategories,
    categories ? { fallbackData: categories } : undefined,
  );
  const services = useMemo(
    () => servicesQuery.data || initialServices || [],
    [initialServices, servicesQuery.data],
  );
  const categoryOptions = useMemo(
    () => categoriesQuery.data || categories || [],
    [categories, categoriesQuery.data],
  );

  // ── Client-side filtering ──────────────────
  const filteredServices = useMemo(() => {
    if (!categoryId) return services;
    return services.filter((s) => s.category_id === categoryId);
  }, [services, categoryId]);

  // ── Stats ──────────────────────────────────
  const stats = useMemo(
    () => calculateServiceStats(filteredServices),
    [filteredServices]
  );

  // ── Handlers ───────────────────────────────
  const handleQuote = useCallback((service: ServiceRecord) => {
    setQuoteService(service);
  }, []);

  const handleEdit = useCallback((id: string) => {
    router.prefetch(`/services/${id}`);
    router.push(`/services/${id}`);
  }, [router]);

  const handleCreate = useCallback(() => {
    router.prefetch("/services/create");
    router.push("/services/create");
  }, [router]);

  const warmEdit = useCallback((id: string) => {
    router.prefetch(`/services/${id}`);
  }, [router]);

  return (
    <div className="main-container gap-3!">
      {/* ── Stats + Action (unified container — same pattern as contracts) ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <ServiceStatsBar stats={stats} />
        <div className="hidden lg:flex">
          <Button
            onPointerEnter={() => router.prefetch("/services/create")}
            onFocus={() => router.prefetch("/services/create")}
            onClick={handleCreate}
            className="gap-2 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm dịch vụ</span>
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <ServiceFilters
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categoryOptions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
      />

      {/* ── Content ── */}
      {servicesQuery.isLoading && !servicesQuery.data ? (
        <div className="card-base p-5">
          <SkeletonTable rows={6} />
        </div>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={Package}
          title={categoryId ? "Không tìm thấy dịch vụ" : "Chưa có dịch vụ nào"}
          description={
            categoryId
              ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
              : "Bắt đầu bằng cách thêm dịch vụ đầu tiên cho studio."
          }
          actionLabel={!categoryId ? "Thêm dịch vụ" : undefined}
          onAction={!categoryId ? handleCreate : undefined}
        />
      ) : viewMode === "grid" ? (
          <ServiceGrid
            services={filteredServices}
            onQuote={handleQuote}
            onEdit={handleEdit}
            onPrefetch={warmEdit}
          />
      ) : (
        <>
          {/* Desktop Table */}
          <ServiceTable
            services={filteredServices}
            onQuote={handleQuote}
            onEdit={handleEdit}
            onPrefetch={warmEdit}
          />
          {/* Mobile List */}
          <ServiceMobileList
            services={filteredServices}
            onQuote={handleQuote}
            onEdit={handleEdit}
            onPrefetch={warmEdit}
          />
        </>
      )}

      {/* ── FAB: Mobile-only create (shared component) ── */}
      <FAB onClick={handleCreate} label="Thêm dịch vụ" />

      {/* ── CategoryManager modal (Phase 1c) ── */}
      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categoryOptions}
      />

      {/* ── Quote Modal (Phase 1d) ── */}
      {quoteService && (
        <QuoteModal
          service={quoteService}
          onClose={() => setQuoteService(null)}
        />
      )}
    </div>
  );
}
