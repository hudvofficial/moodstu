import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDebouncedCallback } from "use-debounce";
import type { ImageGroup } from "./gallery-helpers";

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const MAX_COLUMNS = 7;
const MIN_COLUMNS = 2;
const DEFAULT_ASPECT_RATIO = 3 / 4;
const DEFAULT_TILE_MIN = 192;
const DEFAULT_GUTTER = 12;
const OVERSCAN = 5; // Number of items to render outside viewport

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface MasonryColumn {
  items: Array<{ group: ImageGroup; globalIndex: number }>;
  height: number;
}

interface VirtualItem {
  group: ImageGroup;
  globalIndex: number;
  estimatedHeight: number;
}

interface UseMasonryVirtualProps {
  groups: ImageGroup[];
  hasMoreServer?: boolean;
  onLoadMore?: () => void;
  maxColumns?: number;
}

// ═══════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════

function resolveCssLength(value: string | null | undefined, fallback: number): number {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed)) return fallback;
  if (trimmed.endsWith("rem") && typeof window !== "undefined") {
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parsed * rootFontSize;
  }

  return parsed;
}

function resolveColumnCount(width: number, tileMin: number, gutter: number, maxCols: number): number {
  const estimated = Math.floor((width + gutter) / (tileMin + gutter));
  return Math.max(MIN_COLUMNS, Math.min(maxCols, estimated || MIN_COLUMNS));
}

/**
 * Distribute items across columns using "shortest column" algorithm
 * This creates a balanced masonry layout
 */
function distributeToColumns(
  groups: ImageGroup[],
  columnCount: number,
  columnWidth: number,
  aspectRatios: Record<string, number>,
  gutter: number
): MasonryColumn[] {
  const columns: MasonryColumn[] = Array.from({ length: columnCount }, () => ({
    items: [],
    height: 0,
  }));

  groups.forEach((group, globalIndex) => {
    // Use DB dimensions if available (prevents layout shift)
    const img = group.displayImage;
    const dbRatio = (img.width && img.height && img.width > 0 && img.height > 0)
      ? img.width / img.height
      : null;

    const ratio = dbRatio || aspectRatios[group.fileGroup] || DEFAULT_ASPECT_RATIO;
    const estimatedHeight = columnWidth / Math.max(ratio, 0.25);

    // Find shortest column
    const targetColumn = columns.reduce((shortest, col, idx) =>
      col.height < columns[shortest].height ? idx : shortest
    , 0);

    // Add item to column
    columns[targetColumn].items.push({ group, globalIndex });
    columns[targetColumn].height += estimatedHeight + gutter;
  });

  return columns;
}

// ═══════════════════════════════════════════
// Main Hook
// ═══════════════════════════════════════════

export function useMasonryVirtual({
  groups,
  hasMoreServer,
  onLoadMore,
  maxColumns = MAX_COLUMNS
}: UseMasonryVirtualProps) {
  // ─── Layout State ──────────────────────────
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      return resolveColumnCount(width, DEFAULT_TILE_MIN, DEFAULT_GUTTER, maxColumns);
    }
    return 5; // Default desktop assumption for SSR
  });

  const [columnWidth, setColumnWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      const cols = resolveColumnCount(width, DEFAULT_TILE_MIN, DEFAULT_GUTTER, maxColumns);
      return Math.max((width - DEFAULT_GUTTER * (cols - 1)) / cols, DEFAULT_TILE_MIN);
    }
    return DEFAULT_TILE_MIN;
  });

  // ─── Image Loading State ───────────────────
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [loadedGroups, setLoadedGroups] = useState<Record<string, boolean>>({});
  const [errorGroups, setErrorGroups] = useState<Record<string, boolean>>({});

  // ─── Refs ──────────────────────────────────
  const masonryRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // ─── Debounced Layout Update ───────────────
  const debouncedUpdateLayout = useDebouncedCallback((width: number) => {
    const rootStyle = getComputedStyle(document.documentElement);
    const tileMin = resolveCssLength(rootStyle.getPropertyValue("--gallery-admin-tile-min"), DEFAULT_TILE_MIN);
    const gutter = resolveCssLength(rootStyle.getPropertyValue("--gallery-admin-masonry-gap"), DEFAULT_GUTTER);
    const nextColumnCount = resolveColumnCount(width, tileMin, gutter, maxColumns);
    const nextColumnWidth = Math.max((width - gutter * (nextColumnCount - 1)) / nextColumnCount, tileMin);

    setColumnCount((prev) => (prev === nextColumnCount ? prev : nextColumnCount));
    setColumnWidth((prev) => (Math.abs(prev - nextColumnWidth) < 1 ? prev : nextColumnWidth));
  }, 150);

  // ─── Resize Observer ───────────────────────
  useEffect(() => {
    const element = masonryRef.current;
    if (!element) return;

    const updateLayout = (width: number) => {
      const rootStyle = getComputedStyle(document.documentElement);
      const tileMin = resolveCssLength(rootStyle.getPropertyValue("--gallery-admin-tile-min"), DEFAULT_TILE_MIN);
      const gutter = resolveCssLength(rootStyle.getPropertyValue("--gallery-admin-masonry-gap"), DEFAULT_GUTTER);
      const nextColumnCount = resolveColumnCount(width, tileMin, gutter, maxColumns);
      const nextColumnWidth = Math.max((width - gutter * (nextColumnCount - 1)) / nextColumnCount, tileMin);

      setColumnCount((prev) => (prev === nextColumnCount ? prev : nextColumnCount));
      setColumnWidth((prev) => (Math.abs(prev - nextColumnWidth) < 1 ? prev : nextColumnWidth));
    };

    // Initial layout (immediate, no debounce)
    updateLayout(element.clientWidth || window.innerWidth);

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => debouncedUpdateLayout(element.clientWidth || window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) debouncedUpdateLayout(width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [maxColumns, debouncedUpdateLayout]);

  // ─── Distribute Items to Columns ───────────
  const columnGroups = useMemo(() => {
    const gutter = DEFAULT_GUTTER; // Could be made dynamic
    const columns = distributeToColumns(groups, columnCount, columnWidth, aspectRatios, gutter);
    return columns;
  }, [groups, columnCount, columnWidth, aspectRatios]);

  // ─── Virtual Scrolling Setup ───────────────
  // Create a flat list of all items across all columns for virtualization
  // Each "virtual row" represents one item from the tallest column
  const maxColumnLength = Math.max(...columnGroups.map(col => col.items.length), 0);

  const virtualizer = useVirtualizer({
    count: maxColumnLength,
    getScrollElement: () => {
      // Use window scrolling (parent is body/html)
      if (typeof window !== "undefined") {
        return window.document.documentElement;
      }
      return null;
    },
    estimateSize: useCallback((index: number) => {
      // Estimate row height based on items at this row index across all columns
      let maxHeight = 0;
      const gutter = DEFAULT_GUTTER;

      columnGroups.forEach(column => {
        const item = column.items[index];
        if (item) {
          const img = item.group.displayImage;
          const dbRatio = (img.width && img.height && img.width > 0 && img.height > 0)
            ? img.width / img.height
            : null;

          const ratio = dbRatio || aspectRatios[item.group.fileGroup] || DEFAULT_ASPECT_RATIO;
          const estimatedHeight = columnWidth / Math.max(ratio, 0.25);
          maxHeight = Math.max(maxHeight, estimatedHeight);
        }
      });

      return maxHeight > 0 ? maxHeight + gutter : 300; // Fallback to 300px
    }, [columnGroups, columnWidth, aspectRatios]),
    overscan: OVERSCAN,
    // Enable smooth scrolling measurement
    measureElement: typeof window !== "undefined" && "IntersectionObserver" in window
      ? (element) => element?.getBoundingClientRect().height
      : undefined,
  });

  // ─── Get Virtual Items ─────────────────────
  const virtualItems = virtualizer.getVirtualItems();

  // Build column data for visible virtual rows only
  const visibleColumnGroups = useMemo(() => {
    if (virtualItems.length === 0) {
      // Render first few rows initially for SSR/first paint
      const initialRows = Math.min(3, maxColumnLength);
      return columnGroups.map(column => ({
        items: column.items.slice(0, initialRows),
        height: column.height,
      }));
    }

    const visibleIndices = new Set(virtualItems.map(v => v.index));

    return columnGroups.map(column => ({
      items: column.items.filter((_, idx) => visibleIndices.has(idx)),
      height: column.height,
    }));
  }, [virtualItems, columnGroups, maxColumnLength]);

  // ─── Infinite Scroll Detection ─────────────
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    // Load more when we're near the end
    if (lastItem.index >= maxColumnLength - 5 && hasMoreServer && onLoadMore) {
      onLoadMore();
    }
  }, [virtualItems, maxColumnLength, hasMoreServer, onLoadMore]);

  // ─── Image Load Handlers ───────────────────
  const handleImageLoad = useCallback((fileGroup: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;

    const ratio = naturalWidth / naturalHeight;
    setAspectRatios((prev) => {
      if (prev[fileGroup] === ratio) return prev;
      return { ...prev, [fileGroup]: ratio };
    });

    setLoadedGroups((prev) => {
      if (prev[fileGroup]) return prev;
      return { ...prev, [fileGroup]: true };
    });
  }, []);

  const handleImageError = useCallback((imageUrl: string, event: React.SyntheticEvent<HTMLImageElement>, fileGroup?: string) => {
    const element = event.currentTarget;

    // If already using proxy, mark as error (no more fallbacks)
    if (element.src.includes('/api/drive-download/')) {
      if (fileGroup) {
        setErrorGroups((prev) => prev[fileGroup] ? prev : { ...prev, [fileGroup]: true });
        setLoadedGroups((prev) => prev[fileGroup] ? prev : { ...prev, [fileGroup]: true });
      }
      return;
    }

    // Single fallback: try full image URL
    if (!element.dataset.retryLevel) {
      element.dataset.retryLevel = "1";
      element.src = imageUrl;
      return;
    }

    // Full image failed → mark as error
    if (fileGroup) {
      setErrorGroups((prev) => prev[fileGroup] ? prev : { ...prev, [fileGroup]: true });
      setLoadedGroups((prev) => prev[fileGroup] ? prev : { ...prev, [fileGroup]: true });
    }
  }, []);

  // ─── Return API ────────────────────────────
  return {
    // Refs
    masonryRef,
    scrollElementRef,

    // Virtualizer
    virtualizer,
    virtualItems,

    // Layout
    columnGroups: visibleColumnGroups,
    columnCount,
    columnWidth,

    // State
    aspectRatios,
    loadedGroups,
    errorGroups,

    // Handlers
    handleImageLoad,
    handleImageError,

    // Constants
    DEFAULT_ASPECT_RATIO,

    // Stats
    stats: {
      totalItems: groups.length,
      maxRowIndex: maxColumnLength,
      visibleRows: virtualItems.length,
      renderedItems: visibleColumnGroups.reduce((sum, col) => sum + col.items.length, 0),
      virtualizedOut: groups.length - visibleColumnGroups.reduce((sum, col) => sum + col.items.length, 0),
    }
  };
}
