"use client";

import { memo, useState } from "react";
import { Search, LayoutGrid, List, Settings } from "lucide-react";
import type { ServiceCategory } from "@/types/service";
import type { ViewMode } from "@/types/service-constants";
import { cn } from "@/lib/utils";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  categoryId: string;
  onCategoryChange: (v: string) => void;
  categories: ServiceCategory[];
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onOpenCategoryManager: () => void;
}

function ServiceFiltersInner({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  categories,
  viewMode,
  onViewModeChange,
  onOpenCategoryManager,
}: Props) {
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {/* ── Row 1: Search (desktop inline) + Actions ── */}
      <div className="flex items-center gap-2">
        {/* Mobile search toggle */}
        <button
          onClick={() => setShowMobileSearch((v) => !v)}
          className="lg:hidden icon-btn"
          aria-label="Tìm kiếm"
        >
          <Search className="w-4.5 h-4.5" />
        </button>

        {/* Desktop search — always visible */}
        <div className="hidden lg:flex flex-1">
          <div className="section-search-inline max-w-xs">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo tên hoặc mã dịch vụ..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-bg-hover rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "list" ? "bg-bg-card shadow-xs text-text-main" : "text-text-muted hover:text-text-secondary"
            )}
            aria-label="Danh sách"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "grid" ? "bg-bg-card shadow-xs text-text-main" : "text-text-muted hover:text-text-secondary"
            )}
            aria-label="Lưới"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Category manager */}
        <button
          onClick={onOpenCategoryManager}
          className="icon-btn"
          aria-label="Quản lý danh mục"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* ── Mobile search bar (expandable) ── */}
      {showMobileSearch && (
        <div className="lg:hidden section-search-inline">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên hoặc mã dịch vụ..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
            autoFocus
          />
        </div>
      )}

      {/* ── Row 2: Category chips ── */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => onCategoryChange("")}
            className={cn(
              "tab-pill shrink-0",
              !categoryId ? "tab-pill-active" : "tab-pill-inactive"
            )}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id === categoryId ? "" : cat.id)}
              className={cn(
                "tab-pill shrink-0",
                cat.id === categoryId ? "tab-pill-active" : "tab-pill-inactive"
              )}
            >
              {cat.icon && <span className="mr-1">{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ServiceFiltersInner);
