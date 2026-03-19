"use client";

import { useState, useEffect, useRef, type RefObject } from "react";

interface UseScrollDirectionOptions {
  /** Minimum scroll delta before toggling (default: 60px) */
  threshold?: number;
  /** Optional ref to scroll container. Falls back to window when not provided. */
  containerRef?: RefObject<HTMLElement | null>;
}

/**
 * Smart hide/show: ẩn khi scroll xuống, hiện khi scroll lên.
 * Port từ V1 — dùng cho mobile header.
 *
 * Supports both window scroll (default) and custom scroll containers
 * via optional containerRef (e.g. <main id="main-scroll">).
 */
export function useScrollDirection({
  threshold = 60,
  containerRef,
}: UseScrollDirectionOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const container = containerRef?.current;
    const target: HTMLElement | Window = container || window;

    const handleScroll = () => {
      if (ticking.current) return;

      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = container ? container.scrollTop : window.scrollY;
        const diff = currentY - lastScrollY.current;

        if (Math.abs(diff) > threshold) {
          setIsVisible(diff < 0 || currentY < threshold);
          lastScrollY.current = currentY;
        }

        ticking.current = false;
      });
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    return () => target.removeEventListener("scroll", handleScroll);
  }, [threshold, containerRef]);

  return { isVisible };
}
