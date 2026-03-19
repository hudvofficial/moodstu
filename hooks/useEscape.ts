"use client";

import { useEffect } from "react";

/**
 * useEscape — Reusable hook cho toàn app
 * Dùng document.addEventListener (không phải window) để đúng spec
 *
 * @param onEscape  Callback khi ESC được nhấn
 * @param active    Chỉ lắng nghe khi active = true (default: true)
 */
export function useEscape(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onEscape, active]);
}
