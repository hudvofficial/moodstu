import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImageGroup } from "./gallery-helpers";
import {
  calculateMasonryLayout,
  filterVisiblePositions,
  getResponsiveColumnCount,
  type MasonryPosition
} from "@/app/actions/gallery-masonry-layout";

const INITIAL_BATCH_SIZE = 100; // Increased for better column distribution
const SCROLL_BATCH_SIZE = 40;
const DEFAULT_ASPECT_RATIO = 3 / 4;
const VIEWPORT_BUFFER = 2000; // Increased buffer for masonry layout

interface UseMasonryPinterestProps {
  groups: ImageGroup[];
  hasMoreServer?: boolean;
  onLoadMore?: () => void;
  maxColumns?: number;
}

export function useMasonryPinterest({
  groups,
  hasMoreServer,
  onLoadMore,
  maxColumns = 7
}: UseMasonryPinterestProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [columnCount, setColumnCount] = useState(5);
  const [positions, setPositions] = useState<MasonryPosition[]>([]);
  const [totalHeight, setTotalHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Track container width and update column count
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateLayout = async (width: number) => {
      // Subtract padding from width for accurate column calculation
      const computedStyle = window.getComputedStyle(element);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const availableWidth = width - paddingLeft - paddingRight;

      setContainerWidth(availableWidth);
      const cols = await getResponsiveColumnCount(availableWidth, maxColumns);
      setColumnCount(cols);
    };

    updateLayout(element.clientWidth || 1200);

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => updateLayout(element.clientWidth || 1200);
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

  // Track scroll position for virtual scrolling
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const scrollPos = window.scrollY || document.documentElement.scrollTop;
      const elementTop = rect.top + scrollPos;

      setScrollTop(scrollPos - elementTop);
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate masonry positions when data changes
  useEffect(() => {
    const visibleGroups = groups.slice(0, visibleCount);
    if (visibleGroups.length === 0) return;

    // Convert groups to items with dimensions
    const items = visibleGroups.map(group => {
      const img = group.displayImage;
      return {
        id: group.fileGroup,
        width: (img as any).width || 3000,
        height: (img as any).height || 2000,
        group
      };
    });

    // Calculate layout
    calculateMasonryLayout(items, containerWidth, columnCount, 16)
      .then(result => {
        setPositions(result.positions);
        setTotalHeight(result.totalHeight);
      });
  }, [groups, visibleCount, containerWidth, columnCount]);

  // Infinite scroll: load more when sentinel is visible
  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (!entries[0]?.isIntersecting) return;

    setVisibleCount(prev => {
      const next = Math.min(prev + SCROLL_BATCH_SIZE, groups.length);
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

  // Filter to visible positions only (virtual scrolling)
  const [visiblePositions, setVisiblePositions] = useState<MasonryPosition[]>([]);

  useEffect(() => {
    filterVisiblePositions(positions, scrollTop, viewportHeight, VIEWPORT_BUFFER)
      .then(setVisiblePositions);
  }, [positions, scrollTop, viewportHeight]);

  // Build groups map for easy lookup
  const groupsMap = useMemo(() => {
    const map = new Map();
    groups.slice(0, visibleCount).forEach(group => {
      map.set(group.fileGroup, group);
    });
    return map;
  }, [groups, visibleCount]);

  // Convert visible positions to renderable items
  const visibleItems = useMemo(() => {
    return visiblePositions.map(pos => ({
      position: pos,
      group: groupsMap.get(pos.id)
    })).filter(item => item.group); // Filter out any missing groups
  }, [visiblePositions, groupsMap]);

  const hasMoreLocal = visibleCount < groups.length;
  const showSentinel = hasMoreLocal || hasMoreServer;

  // Stats
  const stats = {
    total: visibleCount,
    rendered: visibleItems.length,
    removed: visibleCount - visibleItems.length,
    efficiency: visibleCount > 0 ? Math.round(((visibleCount - visibleItems.length) / visibleCount) * 100) : 0
  };

  return {
    containerRef,
    sentinelRef,
    visibleItems,
    totalHeight,
    visibleCount,
    showSentinel,
    stats
  };
}
