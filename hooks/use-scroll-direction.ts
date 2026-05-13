"use client";

import { useState, useEffect, useRef, type RefObject } from "react";

interface UseScrollDirectionOptions {
  /** Minimum scroll delta before toggling (default: 60px) */
  threshold?: number;
  /** Pixels of downward movement after the threshold before hiding. */
  hideDelta?: number;
  /** Pixels of upward movement before showing again. */
  showDelta?: number;
  /** Optional ref to scroll container. Falls back to window when not provided. */
  containerRef?: RefObject<HTMLElement | null>;
  /** Resets header visibility when route/layout context changes. */
  resetKey?: string | number | boolean | null;
  /** Force the header visible while preserving the same API. */
  disabled?: boolean;
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
  hideDelta = 16,
  showDelta = 8,
  containerRef,
  resetKey,
  disabled = false,
}: UseScrollDirectionOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const visibleRef = useRef(true);
  const previousScrollY = useRef(0);
  const lastToggleY = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let resetFrame: number | null = null;

    if (disabled) {
      visibleRef.current = true;
      previousScrollY.current = 0;
      lastToggleY.current = 0;
      resetFrame = requestAnimationFrame(() => setIsVisible(true));
      return () => {
        if (resetFrame !== null) cancelAnimationFrame(resetFrame);
      };
    }

    const container = containerRef?.current;
    const target: HTMLElement | Window = container || window;
    const readScrollY = () => Math.max(0, container ? container.scrollTop : window.scrollY);

    const resetY = readScrollY();
    visibleRef.current = true;
    previousScrollY.current = resetY;
    lastToggleY.current = resetY;
    resetFrame = requestAnimationFrame(() => setIsVisible(true));

    const setVisible = (nextVisible: boolean, currentY: number) => {
      if (visibleRef.current === nextVisible) return;
      visibleRef.current = nextVisible;
      lastToggleY.current = currentY;
      setIsVisible(nextVisible);
    };

    const handleScroll = () => {
      if (frameRef.current !== null) return;

      frameRef.current = requestAnimationFrame(() => {
        const currentY = readScrollY();
        const previousY = previousScrollY.current;

        if (currentY <= threshold) {
          lastToggleY.current = currentY;
          setVisible(true, currentY);
        } else if (
          currentY > previousY + 1 &&
          visibleRef.current &&
          currentY - lastToggleY.current >= hideDelta
        ) {
          setVisible(false, currentY);
        } else if (
          currentY < previousY - 1 &&
          !visibleRef.current &&
          lastToggleY.current - currentY >= showDelta
        ) {
          setVisible(true, currentY);
        }

        previousScrollY.current = currentY;
        frameRef.current = null;
      });
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", handleScroll);
      if (resetFrame !== null) {
        cancelAnimationFrame(resetFrame);
        resetFrame = null;
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [threshold, hideDelta, showDelta, containerRef, resetKey, disabled]);

  return { isVisible };
}
