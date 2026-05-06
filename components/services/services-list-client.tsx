"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus } from "lucide-react";
import { getServiceCategories, getServices } from "@/app/actions/service-queries";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/ux-states";
import { cacheKeys, useSWR } from "@/lib/swr";
import { invalidateServiceAfterWrite } from "@/lib/cache-invalidation";
import { calculateServiceStats } from "@/lib/utils/service-utils";
import { useRealtime } from "@/hooks/use-realtime";
import type { ServiceCategory, ServiceRecord } from "@/types/service";
import type { ViewMode } from "@/types/service-constants";
import { CategoryManagerModal } from "./category-manager-modal";
import ServiceFilters from "./service-filters";
import ServiceGrid from "./service-grid";
import ServiceMobileList from "./service-mobile-list";
import ServiceStatsBar from "./service-stats-bar";
import ServiceTable from "./service-table";
import QuoteModal from "@/components/services/quote/quote-modal";

const SERVICE_PAGE_SIZE = 50;

type ServicesPayload = {
  items: ServiceRecord[];
  total: number;
  page: number;
  limit: number;
};

interface Props {
  initialServices?: ServiceRecord[];
  initialServicesTotal?: number;
  categories?: ServiceCategory[];
}

async function loadServices(): Promise<ServicesPayload> {
  const result = await getServices({ limit: SERVICE_PAGE_SIZE });
  if (!result.success) throw new Error(result.error);
  return result.data || { items: [], total: 0, page: 1, limit: SERVICE_PAGE_SIZE };
}

async function loadCategories() {
  const result = await getServiceCategories();
  if (!result.success) throw new Error(result.error);
  return result.data || [];
}

function normalizeServicesPayload(
  value: unknown,
  fallback?: ServicesPayload,
): ServicesPayload {
  if (Array.isArray(value)) {
    return {
      items: value as ServiceRecord[],
      total: fallback?.total ?? value.length,
      page: 1,
      limit: SERVICE_PAGE_SIZE,
    };
  }

  if (value && typeof value === "object") {
    const payload = value as Partial<ServicesPayload>;
    if (Array.isArray(payload.items)) {
      return {
        items: payload.items,
        total:
          typeof payload.total === "number"
            ? payload.total
            : fallback?.total ?? payload.items.length,
        page: typeof payload.page === "number" ? payload.page : 1,
        limit: typeof payload.limit === "number" ? payload.limit : SERVICE_PAGE_SIZE,
      };
    }
  }

  return fallback || { items: [], total: 0, page: 1, limit: SERVICE_PAGE_SIZE };
}

export default function ServicesListClient({
  initialServices,
  initialServicesTotal,
  categories,
}: Props) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [quoteService, setQuoteService] = useState<ServiceRecord | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const initialServicesPayload = useMemo<ServicesPayload | undefined>(
    () =>
      initialServices
        ? {
            items: initialServices,
            total: initialServicesTotal ?? initialServices.length,
            page: 1,
            limit: SERVICE_PAGE_SIZE,
          }
        : undefined,
    [initialServices, initialServicesTotal],
  );

  const servicesQuery = useSWR(
    cacheKeys.services(),
    loadServices,
    initialServicesPayload
      ? {
          fallbackData: initialServicesPayload,
          revalidateOnFocus: false,
          revalidateOnMount: false,
        }
      : undefined,
  );
  const categoriesQuery = useSWR(
    cacheKeys.categories(),
    loadCategories,
    categories
      ? { fallbackData: categories, revalidateOnFocus: false, revalidateOnMount: false }
      : undefined,
  );
  const mutateServices = servicesQuery.mutate;
  const refreshServiceCaches = useCallback(() => {
    void invalidateServiceAfterWrite();
  }, []);

  useRealtime("services", {
    onChange: refreshServiceCaches,
    debounceMs: 500,
    channelName: "services-list-services",
  });
  useRealtime("service_categories", {
    onChange: refreshServiceCaches,
    debounceMs: 500,
    channelName: "services-list-categories",
  });

  const servicesPayload = useMemo(
    () => normalizeServicesPayload(servicesQuery.data, initialServicesPayload),
    [initialServicesPayload, servicesQuery.data],
  );
  const services = servicesPayload.items;
  const categoryOptions = useMemo(
    () => categoriesQuery.data || categories || [],
    [categories, categoriesQuery.data],
  );

  const filteredServices = useMemo(() => {
    if (!categoryId) return services;
    return services.filter((service) => service.category_id === categoryId);
  }, [services, categoryId]);

  const stats = useMemo(
    () => calculateServiceStats(filteredServices),
    [filteredServices],
  );

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

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || services.length >= servicesPayload.total) return;

    setIsLoadingMore(true);
    try {
      const nextPage = Math.floor(services.length / SERVICE_PAGE_SIZE) + 1;
      const result = await getServices({ page: nextPage, limit: SERVICE_PAGE_SIZE });
      if (!result.success) throw new Error(result.error);
      if (!result.data) throw new Error("Khong the tai them dich vu");

      const existingIds = new Set(services.map((service) => service.id));
      const nextItems = result.data.items.filter((service) => !existingIds.has(service.id));
      await mutateServices(
        {
          ...result.data,
          items: [...services, ...nextItems],
          total: result.data.total,
        },
        false,
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, mutateServices, services, servicesPayload.total]);

  return (
    <div className="main-container gap-3!">
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

      <ServiceFilters
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categoryOptions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
      />

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
              ? "Thử thay đổi bộ lọc hoặc tải thêm dữ liệu."
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
          <ServiceTable
            services={filteredServices}
            onQuote={handleQuote}
            onEdit={handleEdit}
            onPrefetch={warmEdit}
          />
          <ServiceMobileList
            services={filteredServices}
            onQuote={handleQuote}
            onEdit={handleEdit}
            onPrefetch={warmEdit}
          />
        </>
      )}

      {services.length < servicesPayload.total && (
        <div className="flex justify-center py-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore
              ? "Đang tải..."
              : `Tải thêm (${services.length}/${servicesPayload.total})`}
          </Button>
        </div>
      )}

      <FAB onClick={handleCreate} label="Thêm dịch vụ" />

      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categoryOptions}
      />

      {quoteService && (
        <QuoteModal
          service={quoteService}
          onClose={() => setQuoteService(null)}
        />
      )}
    </div>
  );
}
