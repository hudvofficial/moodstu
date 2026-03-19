"use client";

import { useState, useEffect, useRef } from "react";

interface UseScrollDirectionOptions {
  /** Minimum scroll delta before toggling (default: 60px) */
  threshold?: number;
}

/**
 * Smart hide/show: ẩn khi scroll xuống, hiện khi scroll lên.
 * Port từ V1 — dùng cho mobile header.
 */
export function useScrollDirection({ threshold = 60 }: UseScrollDirectionOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;

      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff = currentY - lastScrollY.current;

        if (Math.abs(diff) > threshold) {
          setIsVisible(diff < 0 || currentY < threshold);
          lastScrollY.current = currentY;
        }

        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return { isVisible };
}
