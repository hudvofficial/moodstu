/**
 * 📦 Dress Constants (V2)
 *
 * Display mappings: DB values → Vietnamese labels + colors
 * @see Lesson #65: DB uses snake_case, display uses Vietnamese
 * @see Lesson #18: Status badge colors must be consistent
 */

import type { DressStatus, DressCondition, DressCategory } from "@/lib/validations/dress.schema";

// ─── STATUS → Display ────────────────────────────────────────

interface StatusConfig {
  label: string;
  variant: "success" | "info" | "warning" | "muted" | "danger";
}

export const DRESS_STATUS_MAP: Record<DressStatus, StatusConfig> = {
  available:   { label: "Sẵn sàng",   variant: "success" },
  reserved:    { label: "Đã đặt",     variant: "info" },
  rented:      { label: "Đang thuê",  variant: "warning" },
  maintenance: { label: "Bảo trì",    variant: "muted" },
  retired:     { label: "Ngừng dùng", variant: "danger" },
};

// ─── CONDITION → Display ─────────────────────────────────────

export const DRESS_CONDITION_MAP: Record<DressCondition, string> = {
  new:  "Mới",
  good: "Tốt",
  fair: "Khá",
  worn: "Cũ",
};

// ─── CATEGORY → Icons (Lucide name) ─────────────────────────

interface CategoryConfig {
  label: string;
  icon: string; // Lucide icon name
}

export const DRESS_CATEGORY_MAP: Record<DressCategory, CategoryConfig> = {
  "Váy cưới": { label: "Váy cưới", icon: "shirt" },
  "Áo dài":   { label: "Áo dài",   icon: "shirt" },
  "Vest":     { label: "Vest",     icon: "shirt" },
  "Váy tráp": { label: "Váy tráp", icon: "gift" },
  "Đồ bé":   { label: "Đồ bé",   icon: "baby" },
  "Khác":    { label: "Khác",    icon: "package" },
};

// ─── PAGE SIZE ───────────────────────────────────────────────

export const DRESS_PAGE_SIZE = 18;
