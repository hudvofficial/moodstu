// ═══════════════════════════════════════════
// Mood Studio V2 — Utility functions (SSOT)
// cn, formatCurrency, formatDate, getInitials, formatPhone
// ═══════════════════════════════════════════

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid, parseISO } from "date-fns";


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

/** Format date defensively via date-fns to prevent Invalid Date crash */
export function safeFormatDate(
  dateString: string | Date | null | undefined,
  pattern: string = "dd/MM/yyyy"
): string {
  if (!dateString) return "-";
  
  let d: Date;
  if (dateString instanceof Date) {
    d = dateString;
  } else {
    d = parseISO(dateString);
    if (!isValid(d)) d = new Date(dateString);
  }
  
  if (!isValid(d)) return "-";
  return format(d, pattern);
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

/** Get 2-char initials from full name — SSOT for avatars across all modules */
export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
}

/** Format Vietnamese phone: 0901234001 → 0901 234 001 — SSOT for phone display */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10)
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return phone;
}
