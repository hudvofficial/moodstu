"use client";

import { memo, useMemo } from "react";
import { LayoutGrid, List, Settings } from "lucide-react";
import type { ServiceCategory } from "@/types/service";
import type { ViewMode } from "@/types/service-constants";
import { cn } from "@/lib/utils";
import { TabsFilter } from "@/components/ui/tabs-filter";

interface Props {
  categoryId: string;
  onCategoryChange: (v: string) => void;
  categories: ServiceCategory[];
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onOpenCategoryManager: () => void;
}

function ServiceFiltersInner({
  categoryId,
  onCategoryChange,
  categories,
  viewMode,
  onViewModeChange,
  onOpenCategoryManager,
}: Props) {
  /* ── Map categories → Tab[] for TabsFilter ── */
  const categoryTabs = useMemo(() => {
    const tabs = [{ label: "Tất cả", value: "" }];
    categories.forEach((cat) =>
      tabs.push({ label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name, value: cat.id })
    );
    return tabs;
  }, [categories]);

  return (
    <div className="flex flex-col gap-2">
      {/* ═══ MOBILE: Category pills (1 hàng cuộn ngang) ═══ */}
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={categoryTabs}
          activeTab={categoryId}
          onChange={onCategoryChange}
          variant="pills"
        />
      </div>

      {/* ═══ DESKTOP: Tabs + ViewToggle + CategoryManager ═══ */}
      <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
        {/* LEFT: Category tabs */}
        <TabsFilter
          tabs={categoryTabs}
          activeTab={categoryId}
          onChange={onCategoryChange}
        />

        {/* RIGHT: ViewToggle + CategoryManager */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-elevated p-1 rounded-md shadow-xs">
            <button
              onClick={() => onViewModeChange("list")}
              className={cn(
                "btn-icon min-w-8! w-8! h-8!",
                viewMode === "list"
                  ? "bg-bg-card shadow-xs text-text-main"
                  : "text-text-muted hover:text-text-secondary"
              )}
              aria-label="Danh sách"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "btn-icon min-w-8! w-8! h-8!",
                viewMode === "grid"
                  ? "bg-bg-card shadow-xs text-text-main"
                  : "text-text-muted hover:text-text-secondary"
              )}
              aria-label="Lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Category manager */}
          <button
            onClick={onOpenCategoryManager}
            className="btn-icon"
            aria-label="Quản lý danh mục"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ServiceFiltersInner);
