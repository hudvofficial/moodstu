// ═══════════════════════════════════════════
// Mood Studio V2 — Utility functions
// cn, formatCurrency, formatDate
// ═══════════════════════════════════════════

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Currency symbol — SSOT, đổi 1 chỗ = đổi toàn app */
export const CURRENCY_SYMBOL = "VNĐ";

/** Format number to VND currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

/** Format date to Vietnamese locale */
export function formatDate(
  date: string | Date,
  style: "short" | "long" | "relative" = "short"
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (style === "relative") {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} giờ trước`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} ngày trước`;
  }

  if (style === "long") {
    return d.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Parse string to integer, return null if empty/NaN — shared for form→DB conversion */
export function parseIntOrNull(value: string | undefined | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}
