import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImageGroup } from "./gallery-helpers";

const BATCH_SIZE = 50;
const MAX_COLUMNS = 7;
const MIN_COLUMNS = 2;
const DEFAULT_ASPECT_RATIO = 3 / 4;
const DEFAULT_TILE_MIN = 192;
const DEFAULT_GUTTER = 12;

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

interface UseMasonryGridProps {
  groups: ImageGroup[];
  hasMoreServer?: boolean;
  onLoadMore?: () => void;
  maxColumns?: number;
}

export function useMasonryGrid({ groups, hasMoreServer, onLoadMore, maxColumns = MAX_COLUMNS }: UseMasonryGridProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
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
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [loadedGroups, setLoadedGroups] = useState<Record<string, boolean>>({});
  const masonryRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
  }, []);

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (!entries[0]?.isIntersecting) return;

    setVisibleCount((prev) => {
      const next = Math.min(prev + BATCH_SIZE, groups.length);
      if (next >= groups.length && hasMoreServer && onLoadMore) {
        onLoadMore();
      }
      return next;
    });
  }, [groups.length, hasMoreServer, onLoadMore]);

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

  const columnGroups = useMemo(() => {
    const columns = Array.from({ length: columnCount }, () => [] as Array<{ group: ImageGroup; index: number }>);
    const columnHeights = Array.from({ length: columnCount }, () => 0);

    visibleGroups.forEach((group, index) => {
      const ratio = aspectRatios[group.fileGroup] || DEFAULT_ASPECT_RATIO;
      const estimatedHeight = 1 / Math.max(ratio, 0.25);
      const targetColumn = columnHeights.indexOf(Math.min(...columnHeights));

      columns[targetColumn].push({ group, index });
      columnHeights[targetColumn] += estimatedHeight;
    });

    return columns;
  }, [aspectRatios, columnCount, visibleGroups]);

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
      // Fallback cũng lỗi → vẫn đánh dấu loaded để bỏ skeleton trắng
      if (fileGroup) {
        setLoadedGroups((prev) => {
          if (prev[fileGroup]) return prev;
          return { ...prev, [fileGroup]: true };
        });
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
    handleImageLoad,
    handleImageError,
    DEFAULT_ASPECT_RATIO
  };
}
