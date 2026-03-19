"use client";

/**
 * 🎨 Service Color Map — SSOT for service-type styling
 *
 * All service-type colors defined here. Components import, never hardcode.
 * Uses semantic design tokens where possible, Tailwind palette for category-specific.
 */

// ─── SERVICE TYPE COLORS (Avatar + Badge) ────────────────
// V2 DB service_type_enum: exact key match

export const SERVICE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  studio:    { bg: "bg-pink-100",   text: "text-pink-600" },
  ngay_cuoi: { bg: "bg-pink-100",   text: "text-pink-600" },
  combo:     { bg: "bg-pink-100",   text: "text-pink-600" },
  baby:      { bg: "bg-purple-100", text: "text-purple-600" },
  bau:       { bg: "bg-purple-100", text: "text-purple-600" },
  gia_dinh:  { bg: "bg-teal-100",   text: "text-teal-600" },
  sinh_nhat: { bg: "bg-orange-100", text: "text-orange-600" },
  concept:   { bg: "bg-indigo-100", text: "text-indigo-600" },
  couple:    { bg: "bg-rose-100",   text: "text-rose-600" },
  ky_yeu:    { bg: "bg-cyan-100",   text: "text-cyan-600" },
  media:     { bg: "bg-amber-100",  text: "text-amber-600" },
  khac:      { bg: "bg-amber-100",  text: "text-amber-600" },
};

const DEFAULT_SERVICE_COLOR = { bg: "bg-primary/10", text: "text-primary" };

export function getServiceColor(serviceType: string | null): { bg: string; text: string } {
  if (!serviceType) return DEFAULT_SERVICE_COLOR;
  return SERVICE_TYPE_COLORS[serviceType.toLowerCase()] || DEFAULT_SERVICE_COLOR;
}

// ─── SERVICE BADGE COLORS (lighter variant) ──────────────

const SERVICE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  studio:    { bg: "bg-pink-50",    text: "text-pink-600" },
  ngay_cuoi: { bg: "bg-pink-50",    text: "text-pink-600" },
  combo:     { bg: "bg-pink-50",    text: "text-pink-600" },
  baby:      { bg: "bg-purple-50",  text: "text-purple-600" },
  bau:       { bg: "bg-purple-50",  text: "text-purple-600" },
  gia_dinh:  { bg: "bg-teal-50",    text: "text-teal-600" },
  sinh_nhat: { bg: "bg-orange-50",  text: "text-orange-600" },
  concept:   { bg: "bg-indigo-50",  text: "text-indigo-600" },
  couple:    { bg: "bg-rose-50",    text: "text-rose-600" },
  ky_yeu:    { bg: "bg-cyan-50",    text: "text-cyan-600" },
  media:     { bg: "bg-amber-50",   text: "text-amber-600" },
  khac:      { bg: "bg-amber-50",   text: "text-amber-600" },
};

const DEFAULT_BADGE_COLOR = { bg: "bg-bg-hover", text: "text-text-secondary" };

export function getServiceBadgeColor(serviceType: string | null): { bg: string; text: string } {
  if (!serviceType) return DEFAULT_BADGE_COLOR;
  return SERVICE_BADGE_COLORS[serviceType.toLowerCase()] || DEFAULT_BADGE_COLOR;
}

// ─── CHECKLIST CATEGORY COLORS ───────────────────────────

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "lễ tân":  { bg: "bg-amber-50", text: "text-amber-700" },
  "makeup":  { bg: "bg-pink-50",  text: "text-pink-600" },
  "photo":   { bg: "bg-blue-50",  text: "text-blue-600" },
};

const DEFAULT_CATEGORY_COLOR = { bg: "bg-bg-hover", text: "text-text-secondary" };

export function getCategoryColor(category: string): { bg: string; text: string } {
  const key = Object.keys(CATEGORY_COLORS).find((k) =>
    category.toLowerCase().includes(k),
  );
  return key ? CATEGORY_COLORS[key] : DEFAULT_CATEGORY_COLOR;
}
