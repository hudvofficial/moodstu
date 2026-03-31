"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Package } from "lucide-react";
import type { ServiceRecord, ServiceCategory } from "@/types/service";
import type { ViewMode } from "@/types/service-constants";
import { calculateServiceStats } from "@/lib/utils/service-utils";
import ServiceStatsBar from "./service-stats-bar";
import ServiceFilters from "./service-filters";
import ServiceTable from "./service-table";
import ServiceMobileList from "./service-mobile-list";
import ServiceGrid from "./service-grid";
import { EmptyState } from "@/components/ui/ux-states";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { CategoryManagerModal } from "./category-manager-modal";
import QuoteModal from "@/components/services/quote/quote-modal";

interface Props {
  initialServices: ServiceRecord[];

  categories: ServiceCategory[];
}

export default function ServicesListClient({
  initialServices,
  categories,
}: Props) {
  // ── State ──────────────────────────────────
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [quoteService, setQuoteService] = useState<ServiceRecord | null>(null);

  // ── Client-side filtering ──────────────────
  const filteredServices = useMemo(() => {
    let result = initialServices;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.service_code.toLowerCase().includes(q)
      );
    }

    if (categoryId) {
      result = result.filter((s) => s.category_id === categoryId);
    }

    return result;
  }, [initialServices, search, categoryId]);

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
    router.push(`/services/${id}`);
  }, [router]);

  const handleCreate = useCallback(() => {
    router.push("/services/create");
  }, [router]);

  return (
    <div className="main-container gap-3!">
      {/* ── Stats + Action (unified container — same pattern as contracts) ── */}
      <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <ServiceStatsBar stats={stats} />
        <div className="hidden lg:flex">
          <Button onClick={handleCreate} className="gap-2 shrink-0">
            <Plus className="w-5 h-5" />
            <span>Thêm dịch vụ</span>
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <ServiceFilters
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categories}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenCategoryManager={() => setShowCategoryManager(true)}
      />

      {/* ── Content ── */}
      {filteredServices.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search || categoryId ? "Không tìm thấy dịch vụ" : "Chưa có dịch vụ nào"}
          description={
            search || categoryId
              ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
              : "Bắt đầu bằng cách thêm dịch vụ đầu tiên cho studio."
          }
          actionLabel={!search && !categoryId ? "Thêm dịch vụ" : undefined}
          onAction={!search && !categoryId ? handleCreate : undefined}
        />
      ) : viewMode === "grid" ? (
        <ServiceGrid
          services={filteredServices}
          onQuote={handleQuote}
          onEdit={handleEdit}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <ServiceTable
            services={filteredServices}
            onQuote={handleQuote}
            onEdit={handleEdit}
          />
          {/* Mobile List */}
          <ServiceMobileList
            services={filteredServices}
            onQuote={handleQuote}
            onEdit={handleEdit}
          />
        </>
      )}

      {/* ── FAB: Mobile-only create (shared component) ── */}
      <FAB onClick={handleCreate} label="Thêm dịch vụ" />

      {/* ── CategoryManager modal (Phase 1c) ── */}
      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
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
