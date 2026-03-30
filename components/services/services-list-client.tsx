"use client";

import { useState, useMemo, useCallback } from "react";
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

interface Props {
  initialServices: ServiceRecord[];

  categories: ServiceCategory[];
}

export default function ServicesListClient({
  initialServices,
  categories,
}: Props) {
  // ── State ──────────────────────────────────
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCategoryManager, setShowCategoryManager] = useState(false); // Phase 1c

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
    // TODO: Phase 1d — Open quote modal
    console.log("[Quote]", service.id);
  }, []);

  const handleEdit = useCallback((id: string) => {
    // TODO: Phase 1c — Navigate to edit or open form
    console.log("[Edit]", id);
  }, []);

  const handleCreate = useCallback(() => {
    // TODO: Phase 1c — Open create form
    console.log("[Create]");
  }, []);

  return (
    <div className="main-container gap-3!">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-h2">Dịch vụ</h1>
        <button
          onClick={handleCreate}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Thêm dịch vụ</span>
        </button>
      </div>

      {/* ── Stats ── */}
      <ServiceStatsBar stats={stats} />

      {/* ── Filters ── */}
      <ServiceFilters
        search={search}
        onSearchChange={setSearch}
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

      {/* ── FAB: Mobile-only create ── */}
      <button
        onClick={handleCreate}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Thêm dịch vụ"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* TODO: Phase 1c — CategoryManager modal */}
      {/* TODO: Phase 1c — ServiceForm modal */}
    </div>
  );
}
