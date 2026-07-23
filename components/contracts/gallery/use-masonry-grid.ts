import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import type { ImageGroup } from "./gallery-helpers";

const INITIAL_BATCH_SIZE = 200; // Match default pageSize from useGalleryData
const SCROLL_BATCH_SIZE = 50;
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
  loadingMore?: boolean;
  onLoadMore?: () => void;
  maxColumns?: number;
}

export function useMasonryGrid({ groups, hasMoreServer, loadingMore, onLoadMore, maxColumns = MAX_COLUMNS }: UseMasonryGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
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
  const [errorGroups, setErrorGroups] = useState<Record<string, boolean>>({});
  const masonryRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounced layout update to prevent thrashing during resize
  const debouncedUpdateLayout = useDebouncedCallback((width: number) => {
    const rootStyle = getComputedStyle(document.documentElement);
    const tileMin = resolveCssLength(rootStyle.getPropertyValue("--gallery-admin-tile-min"), DEFAULT_TILE_MIN);
    const gutter = resolveCssLength(rootStyle.getPropertyValue("--gallery-admin-masonry-gap"), DEFAULT_GUTTER);
    const nextColumnCount = resolveColumnCount(width, tileMin, gutter, maxColumns);
    const nextColumnWidth = Math.max((width - gutter * (nextColumnCount - 1)) / nextColumnCount, tileMin);

    setColumnCount((prev) => (prev === nextColumnCount ? prev : nextColumnCount));
    setColumnWidth((prev) => (Math.abs(prev - nextColumnWidth) < 1 ? prev : nextColumnWidth));
  }, 150); // Wait 150ms after resize stops

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

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    console.log('[useMasonryGrid] 👁️ INTERSECTION:', {
      isIntersecting: entries[0]?.isIntersecting,
      boundingRect: entries[0]?.boundingClientRect,
      rootBounds: entries[0]?.rootBounds
    });

    if (!entries[0]?.isIntersecting) return;

    setVisibleCount((prev) => {
      const next = Math.min(prev + SCROLL_BATCH_SIZE, groups.length);
      console.log(`[useMasonryGrid] 📜 SCROLL: ${prev} → ${next}/${groups.length}, hasMoreServer=${hasMoreServer}`);
      if (next >= groups.length && hasMoreServer && onLoadMore) {
        console.log('[useMasonryGrid] 🚀 TRIGGER onLoadMore()');
        onLoadMore();
      }
      return next;
    });
  }, [groups.length, hasMoreServer, onLoadMore]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    // Aggressive prefetch: load next batch 400px before sentinel enters viewport
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "400px 0px" // Top/bottom margin for smooth prefetch
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const visibleGroups = groups.slice(0, visibleCount);
  const hasMoreLocal = visibleCount < groups.length;
  const showSentinel = hasMoreLocal || hasMoreServer;

  // Auto-trigger onLoadMore if all local images rendered but server has more
  useEffect(() => {
    if (visibleCount >= groups.length && hasMoreServer && onLoadMore && !hasMoreLocal && !loadingMore) {
      console.log('[useMasonryGrid] ⚡ AUTO-TRIGGER: All local images rendered, fetching next page');
      onLoadMore();
    }
  }, [visibleCount, groups.length, hasMoreServer, onLoadMore, hasMoreLocal, loadingMore]);

  const columnGroups = useMemo(() => {
    const columns = Array.from({ length: columnCount }, () => [] as Array<{ group: ImageGroup; index: number }>);
    const columnHeights = Array.from({ length: columnCount }, () => 0);

    visibleGroups.forEach((group, index) => {
      // Use actual dimensions from DB if available (prevents layout shift)
      const img = group.displayImage;
      const dbRatio = (img.width && img.height && img.width > 0 && img.height > 0)
        ? img.width / img.height
        : null;

      const ratio = dbRatio || aspectRatios[group.fileGroup] || DEFAULT_ASPECT_RATIO;
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

  // Retry level per fileGroup (useRef → không trigger re-render; survive Next.js Image reconcile reset của element.dataset)
  // 0 = original (lh3 với =sN), 1 = lh3 raw (image_url), 2 = proxy server, 3+ = error final
  const retryLevelsRef = useRef<Map<string, number>>(new Map());

  const handleImageError = useCallback((
    imageUrl: string,
    driveFileId: string | null,
    event: React.SyntheticEvent<HTMLImageElement>,
    fileGroup?: string,
  ) => {
    if (!fileGroup) return;
    const element = event.currentTarget;
    const level = retryLevelsRef.current.get(fileGroup) ?? 0;

    // Level 0 fail (lh3 với =sN) → thử lh3 raw (image_url, không =sN)
    if (level === 0) {
      retryLevelsRef.current.set(fileGroup, 1);
      element.src = imageUrl;
      return;
    }

    // Level 1 fail (lh3 raw) → thử proxy server.
    // PHẢI truyền ?size: không có nó proxy redirect sang =s0 = nguyên file gốc (~15 MB)
    // chỉ để vẽ một ô thumbnail 600px → đốt data di động của khách. 600 khớp cỡ
    // thumbnail lưới đang dùng (ADR-012).
    if (level === 1 && driveFileId) {
      retryLevelsRef.current.set(fileGroup, 2);
      element.src = `/api/drive-download/${driveFileId}?size=600`;
      return;
    }

    // Level 2 fail (proxy) hoặc không có driveFileId → mark error
    retryLevelsRef.current.set(fileGroup, 3);
    setErrorGroups((prev) => prev[fileGroup] ? prev : { ...prev, [fileGroup]: true });
    setLoadedGroups((prev) => prev[fileGroup] ? prev : { ...prev, [fileGroup]: true });
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
    DEFAULT_ASPECT_RATIO
  };
}
