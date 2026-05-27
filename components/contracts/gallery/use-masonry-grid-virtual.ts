import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImageGroup } from "./gallery-helpers";

const INITIAL_BATCH_SIZE = 60;
const SCROLL_BATCH_SIZE = 40;
const MAX_COLUMNS = 7;
const MIN_COLUMNS = 2;
const DEFAULT_ASPECT_RATIO = 3 / 4;
const DEFAULT_TILE_MIN = 192;
const DEFAULT_GUTTER = 12;

// Virtual scrolling config
const VIEWPORT_BUFFER = 3000; // Keep items ±3000px from viewport (large buffer for masonry)
const CLEANUP_INTERVAL = 2000; // Cleanup every 2 seconds

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

interface UseMasonryGridVirtualProps {
  groups: ImageGroup[];
  hasMoreServer?: boolean;
  onLoadMore?: () => void;
  maxColumns?: number;
}

export function useMasonryGridVirtual({
  groups,
  hasMoreServer,
  onLoadMore,
  maxColumns = MAX_COLUMNS
}: UseMasonryGridVirtualProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      return resolveColumnCount(width, DEFAULT_TILE_MIN, DEFAULT_GUTTER, maxColumns);
    }
    return 5;
  });
  const [columnWidth, setColumnWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      const cols = resolveColumnCount(width, DEFAULT_TILE_MIN, DEFAULT_GUTTER, maxColumns);
      return Math.max((width - DEFAULT_GUTTER * (cols - 1)) / cols, DEFAULT_TILE_MIN);
    }
    return DEFAULT_TILE_MIN;
  });
  // Initialize aspect ratios from DB dimensions if available
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>(() => {
    const ratios: Record<string, number> = {};
    groups.forEach(group => {
      const img = group.displayImage;
      if (img.width && img.height) {
        ratios[group.fileGroup] = img.height / img.width;
      }
    });
    return ratios;
  });
  const [loadedGroups, setLoadedGroups] = useState<Record<string, boolean>>({});
  const [errorGroups, setErrorGroups] = useState<Record<string, boolean>>({});

  // Virtual scrolling state
  const [viewportTop, setViewportTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  const masonryRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track scroll position for virtual windowing
  useEffect(() => {
    const element = masonryRef.current;
    if (!element) return;

    const handleScroll = () => {
      if (scrollCheckTimeoutRef.current) {
        clearTimeout(scrollCheckTimeoutRef.current);
      }

      scrollCheckTimeoutRef.current = setTimeout(() => {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const elementTop = rect.top + scrollTop;

        setViewportTop(scrollTop - elementTop);
        setViewportHeight(window.innerHeight);
      }, 100); // Debounce scroll updates
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial position

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollCheckTimeoutRef.current) {
        clearTimeout(scrollCheckTimeoutRef.current);
      }
    };
  }, []);

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

    updateLayout(element.clientWidth || window.innerWidth);

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => updateLayout(element.clientWidth || window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) updateLayout(width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [maxColumns]);

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (!entries[0]?.isIntersecting) return;

    setVisibleCount((prev) => {
      const next = Math.min(prev + SCROLL_BATCH_SIZE, groups.length);
      if (next >= groups.length && hasMoreServer && onLoadMore) {
        onLoadMore();
      }
      return next;
    });
  }, [groups.length, hasMoreServer, onLoadMore]);

  // Update aspect ratios when groups change (new images with dimensions)
  useEffect(() => {
    const newRatios: Record<string, number> = {};
    let hasNew = false;

    groups.forEach(group => {
      const img = group.displayImage;
      // Use DB dimensions if available, otherwise keep existing ratio
      if (img.width && img.height && !aspectRatios[group.fileGroup]) {
        newRatios[group.fileGroup] = img.height / img.width;
        hasNew = true;
      }
    });

    if (hasNew) {
      setAspectRatios(prev => ({ ...prev, ...newRatios }));
    }
  }, [groups, aspectRatios]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersect, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const visibleGroups = groups.slice(0, visibleCount);
  const hasMoreLocal = visibleCount < groups.length;
  const showSentinel = hasMoreLocal || hasMoreServer;

  // Build column groups with position tracking for virtual windowing
  const columnGroupsWithPositions = useMemo(() => {
    const columns = Array.from({ length: columnCount }, () => [] as Array<{
      group: ImageGroup;
      index: number;
      estimatedTop: number;
      estimatedHeight: number;
    }>);
    const columnHeights = Array.from({ length: columnCount }, () => 0);

    visibleGroups.forEach((group, index) => {
      const ratio = aspectRatios[group.fileGroup] || DEFAULT_ASPECT_RATIO;
      const estimatedHeight = columnWidth / Math.max(ratio, 0.25);
      const targetColumn = columnHeights.indexOf(Math.min(...columnHeights));

      columns[targetColumn].push({
        group,
        index,
        estimatedTop: columnHeights[targetColumn],
        estimatedHeight
      });

      columnHeights[targetColumn] += estimatedHeight + DEFAULT_GUTTER;
    });

    return columns;
  }, [aspectRatios, columnCount, visibleGroups, columnWidth]);

  // Convert back to simple columnGroups (virtual filtering disabled for masonry complexity)
  // Progressive loading already handles performance optimization
  const columnGroups = useMemo(() => {
    return columnGroupsWithPositions.map(column =>
      column.map(item => ({ group: item.group, index: item.index }))
    );
  }, [columnGroupsWithPositions]);

  // Calculate stats (progressive loading stats)
  const totalItems = groups.length; // Total available
  const renderedItems = visibleGroups.length; // Currently loaded via progressive loading
  const removedItems = 0; // Virtual filtering disabled for masonry

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
    if (element.dataset.fallbackApplied === "true") {
      if (fileGroup) {
        setErrorGroups((prev) => prev[fileGroup] ? prev : { ...prev, [fileGroup]: true });
        setLoadedGroups((prev) => prev[fileGroup] ? prev : { ...prev, [fileGroup]: true });
      }
      return;
    }

    element.dataset.fallbackApplied = "true";
    element.src = imageUrl;
  }, []);

  return {
    masonryRef,
    sentinelRef,
    columnGroups,
    columnCount,
    columnWidth,
    visibleCount,
    showSentinel,
    aspectRatios,
    loadedGroups,
    errorGroups,
    handleImageLoad,
    handleImageError,
    DEFAULT_ASPECT_RATIO,
    // Virtual scrolling stats
    virtualStats: {
      total: totalItems,
      rendered: renderedItems,
      removed: removedItems,
      efficiency: totalItems > 0 ? Math.round((removedItems / totalItems) * 100) : 0
    }
  };
}
