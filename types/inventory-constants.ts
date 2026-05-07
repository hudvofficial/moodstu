/**
 * 📦 Inventory Constants
 *
 * Display mappings: DB values → Vietnamese labels + colors
 * @see Lesson #65: DB uses snake_case, display uses Vietnamese
 * @see Lesson #90: Group B VARCHAR + TS enum pattern
 */

import type { InventoryStatus, InventoryCategory, InventoryUnit } from "@/lib/validations/inventory.schema";
import type { BadgeVariant } from "@/components/ui/badge";

// ─── STATUS → Display ────────────────────────────────

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

export const INVENTORY_STATUS_MAP: Record<InventoryStatus, StatusConfig> = {
  active:       { label: "Đang dùng", variant: "success" },
  discontinued: { label: "Ngưng",     variant: "neutral" },
};

// ─── CATEGORY → Display ─────────────────────────────

interface CategoryConfig {
  label: string;
  icon: string; // Lucide icon name
}

export const INVENTORY_CATEGORY_MAP: Record<InventoryCategory, CategoryConfig> = {
  in_an:     { label: "In ấn",      icon: "printer" },
  makeup:    { label: "Makeup",     icon: "brush" },
  van_phong_pham: { label: "Văn phòng phẩm", icon: "file-pen-line" },
  khac:      { label: "Khác",       icon: "shapes" },
  khung_anh: { label: "Khung ảnh",  icon: "frame" },
  album:     { label: "Album",      icon: "book-open" },
  hoa:       { label: "Hoa",        icon: "flower-2" },
  tieu_hao:  { label: "Tiêu hao",   icon: "package" },
  trang_tri: { label: "Trang trí",  icon: "sparkles" },
};

// ─── UNIT → Display ──────────────────────────────────

export const INVENTORY_UNIT_MAP: Record<InventoryUnit, string> = {
  cai:  "Cái",
  bo:   "Bộ",
  hop:  "Hộp",
  cuon: "Cuộn",
  met:  "Mét",
  to:   "Tờ",
};

// ─── TRANSACTION TYPE → Display ──────────────────────

export const TRANSACTION_TYPE_MAP: Record<string, StatusConfig> = {
  stock_in:  { label: "Nhập kho", variant: "success" },
  stock_out: { label: "Xuất kho", variant: "warning" },
};

export const INVENTORY_SOURCE_TYPE_MAP: Record<string, StatusConfig> = {
  stock_in: { label: "Nhập kho", variant: "success" },
  contract_fulfillment: { label: "Xuất HĐ", variant: "primary" },
  retail_sale: { label: "Bán lẻ", variant: "success" },
  contract_addon_sale: { label: "Bán thêm HĐ", variant: "primary" },
  internal_use: { label: "Nội bộ", variant: "warning" },
  loss_adjustment: { label: "Hao hụt", variant: "error" },
  correction: { label: "Điều chỉnh", variant: "neutral" },
  return: { label: "Hoàn trả", variant: "info" },
};

// ─── PAGE SIZE ───────────────────────────────────────

export const INVENTORY_PAGE_SIZE = 20;
export const TRANSACTION_PAGE_SIZE = 20;
