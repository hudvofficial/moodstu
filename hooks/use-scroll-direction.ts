"use client";

import { useState, useEffect, useRef, type RefObject } from "react";

interface UseScrollDirectionOptions {
  /** Minimum scroll delta before toggling (default: 60px) */
  threshold?: number;
  /** Optional ref to scroll container. Falls back to window when not provided. */
  containerRef?: RefObject<HTMLElement | null>;
  /** The header element to transform proportionally */
  headerRef?: RefObject<HTMLElement | null>;
  /** Resets header visibility when route/layout context changes. */
  resetKey?: string | number | boolean | null;
  /** Force the header visible while preserving the same API. */
  disabled?: boolean;
}

/**
 * Smart hide/show: ẩn khi scroll xuống, hiện khi scroll lên.
 * Proportional Scroll Pattern: Trượt mượt 1:1 theo ngón tay (CSS variables) 
 * và tự động hút (snap) khi buông tay.
 *
 * Supports both window scroll (default) and custom scroll containers
 * via optional containerRef (e.g. <main id="main-scroll">).
 */
export function useScrollDirection({
  threshold = 60,
  containerRef,
  headerRef,
  resetKey,
  disabled = false,
}: UseScrollDirectionOptions = {}) {
  // We still provide isVisible for components that need simple boolean logic (e.g. shadow opacity on desktop)
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let visibilityFrameId: number | null = null;
    
    // Defer setState to avoid synchronous call within effect body
    const syncVisibility = (nextVisible: boolean) => {
      if (visibilityFrameId !== null) {
        window.cancelAnimationFrame(visibilityFrameId);
      }

      visibilityFrameId = window.requestAnimationFrame(() => {
        setIsVisible(nextVisible);
        visibilityFrameId = null;
      });
    };

    // Reset layout on route change or when disabled
    if (disabled || !headerRef?.current) {
      document.documentElement.style.setProperty('--header-translate-y', '0px');
      document.documentElement.style.setProperty('--header-transition', 'transform 0.3s ease-out');
      syncVisibility(true);
      return () => {
        if (visibilityFrameId !== null) window.cancelAnimationFrame(visibilityFrameId);
      };
    }

    const header = headerRef.current;
    const container = containerRef?.current;
    const target: HTMLElement | Window = container || window;
    
    // Read the current scroll position accurately
    const readScrollY = () => Math.max(0, container ? container.scrollTop : window.scrollY);
    
    let previousY = readScrollY();
    let currentTranslateY = 0;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let isTouchDown = false;
    let ticking = false;

    // Reset initial state
    document.documentElement.style.setProperty('--header-translate-y', '0px');
    document.documentElement.style.setProperty('--header-transition', 'none');
    syncVisibility(true);

    const handleTouchStart = () => { isTouchDown = true; };
    const handleTouchEnd = () => {
      isTouchDown = false;
      snapIfNeeded();
    };

    const snapIfNeeded = () => {
      if (isTouchDown) return; // Don't snap while dragging

      const height = header.offsetHeight || 56; // Fallback to 56px if not measured
      
      // Only snap if we are in the middle of transitioning
      if (currentTranslateY < 0 && currentTranslateY > -height) {
        // If hidden more than half, snap to hide completely. Otherwise show completely.
        const shouldHide = currentTranslateY < -(height / 2);
        currentTranslateY = shouldHide ? -height : 0;
        
        // Apply snap with smooth transition
        document.documentElement.style.setProperty('--header-transition', 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)');
        document.documentElement.style.setProperty('--header-translate-y', `${currentTranslateY}px`);
        
        syncVisibility(!shouldHide);
      } else {
        // We are already at a boundary, just ensure state is sync
        syncVisibility(currentTranslateY === 0);
      }
    };

    const updatePosition = () => {
      const currentY = readScrollY();
      const delta = currentY - previousY;
      previousY = currentY;
      const height = header.offsetHeight || 56;

      // 1. Rubber-banding (pull down past top) -> Show fully
      if (currentY <= 0) {
        currentTranslateY = 0;
      } 
      // 2. Below threshold -> Show fully (unless disabled by some logic, but we want it sticky at top)
      else if (currentY <= threshold && currentTranslateY === 0) {
        currentTranslateY = 0;
      }
      // 3. Proportional scroll mapping
      else {
        currentTranslateY -= delta;
        // Clamp between fully hidden (-height) and fully visible (0)
        currentTranslateY = Math.max(-height, Math.min(0, currentTranslateY));
      }

      // Apply 1:1 finger tracking without CSS transitions
      document.documentElement.style.setProperty('--header-transition', 'none');
      document.documentElement.style.setProperty('--header-translate-y', `${currentTranslateY}px`);

      // Set shadow opacity purely via CSS variable to avoid React renders
      const shadowOpacity = 1 - Math.abs(currentTranslateY / height);
      document.documentElement.style.setProperty('--header-shadow-opacity', String(shadowOpacity));

      ticking = false;

      // Debounce snap detection
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        snapIfNeeded();
      }, 150);
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updatePosition);
        ticking = true;
      }
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    target.addEventListener("touchstart", handleTouchStart, { passive: true });
    target.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    return () => {
      target.removeEventListener("scroll", handleScroll);
      target.removeEventListener("touchstart", handleTouchStart);
      target.removeEventListener("touchend", handleTouchEnd);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (visibilityFrameId !== null) window.cancelAnimationFrame(visibilityFrameId);
    };
  }, [threshold, containerRef, headerRef, resetKey, disabled]);

  return { isVisible };
}
