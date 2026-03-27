/**
 * 📦 Dress Constants (V2)
 *
 * Display mappings: DB ENUM values → Vietnamese labels + colors
 * @see Lesson #65: DB uses snake_case ENUM, display uses Vietnamese
 * @see Lesson #18: Status badge colors must be consistent
 */

import type { DressStatus, DressCondition, DressCategory } from "@/lib/validations/dress.schema";
import type { BadgeVariant } from "@/components/ui/badge";

// ─── STATUS → Display ────────────────────────────────────────

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

export const DRESS_STATUS_MAP: Record<DressStatus, StatusConfig> = {
  available:   { label: "Sẵn sàng",   variant: "success" },
  reserved:    { label: "Đã đặt",     variant: "info" },
  rented:      { label: "Đang thuê",  variant: "warning" },
  maintenance: { label: "Bảo trì",    variant: "neutral" },
  cleaning:    { label: "Đang giặt",  variant: "neutral" },
  overdue:     { label: "Quá hạn",    variant: "error" },
  retired:     { label: "Ngừng dùng", variant: "error" },
};

// ─── CONDITION → Display ─────────────────────────────────────

export const DRESS_CONDITION_MAP: Record<DressCondition, string> = {
  new:  "Mới",
  good: "Tốt",
  fair: "Khá",
  worn: "Cũ",
};

// ─── CATEGORY → Display (ENUM key → Vietnamese label + icon) ─

interface CategoryConfig {
  label: string;
  icon: string; // Lucide icon name
}

export const DRESS_CATEGORY_MAP: Record<DressCategory, CategoryConfig> = {
  vay_cuoi:   { label: "Váy cưới",    icon: "shirt" },
  ao_dai:     { label: "Áo dài",      icon: "shirt" },
  vest:       { label: "Vest",        icon: "shirt" },
  vay_trap:   { label: "Váy tráp",    icon: "gift" },
  do_be:      { label: "Đồ bé",      icon: "baby" },
  vay_da_hoi: { label: "Váy dạ hội",  icon: "sparkles" },
  phu_kien:   { label: "Phụ kiện",    icon: "gem" },
  khac:       { label: "Khác",       icon: "package" },
};

// ─── CATEGORY → ITEM CODE PREFIX (SSOT) ─────────────────────

export const CATEGORY_PREFIX_MAP: Record<string, string> = {
  vay_cuoi:   "VC",
  ao_dai:     "AD",
  vest:       "VT",
  vay_trap:   "VTR",
  do_be:      "DB",
  vay_da_hoi: "VD",
  phu_kien:   "PK",
  khac:       "K",
};

// ─── RESERVATION STATUS → Display ────────────────────────────

export const RESERVATION_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  reserved:  { label: "Đã đặt",     variant: "info" },
  rented:    { label: "Đang thuê",  variant: "warning" },
  returned:  { label: "Đã trả",     variant: "neutral" },
  cancelled: { label: "Đã hủy",     variant: "neutral" },
};

// ─── RENTAL STATUS (standalone rentals) → Display ────────────

export const RENTAL_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  reserved:  { label: "Đã đặt",    variant: "info" },
  renting:   { label: "Đang thuê", variant: "warning" },
  returned:  { label: "Đã trả",    variant: "success" },
  overdue:   { label: "Quá hạn",   variant: "error" },
  cancelled: { label: "Đã hủy",    variant: "neutral" },
};

// ─── PAGE SIZE ───────────────────────────────────────────────

export const DRESS_PAGE_SIZE = 18;
export const RENTAL_HISTORY_PAGE_SIZE = 20;
