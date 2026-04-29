/**
 * 📦 Inventory Zod Schemas
 *
 * Validates inventory form submissions before DB operations.
 * DB tables: inventory_items, inventory_transactions
 *
 * @see Lesson #72: FK *_by → auth.users(id)
 * @see Lesson #89-90: Group B VARCHAR + TS enum pattern
 */

import { z } from "zod";

// ─── Categories (Group B — VARCHAR in DB) ────────────

export const INVENTORY_CATEGORIES = [
  "khung_anh",
  "album",
  "hoa",
  "tieu_hao",
  "trang_tri",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

// ─── Status (Group B — VARCHAR in DB) ────────────────

export const INVENTORY_STATUSES = [
  "active",
  "discontinued",
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const INVENTORY_FILTER_STATUSES = [
  "all",
  "active",
  "low_stock",
  "out_of_stock",
  "discontinued",
] as const;

export type InventoryFilterStatus = (typeof INVENTORY_FILTER_STATUSES)[number];

export const INVENTORY_FILTER_CATEGORIES = [
  "all",
  ...INVENTORY_CATEGORIES,
] as const;

export const INVENTORY_SORTS = [
  "newest",
  "name_asc",
  "stock_asc",
  "stock_desc",
] as const;

// ─── Units (Group B — VARCHAR in DB) ─────────────────

export const INVENTORY_UNITS = [
  "cai",
  "bo",
  "hop",
  "cuon",
  "met",
  "to",
] as const;

export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

// ─── Create Schema ──────────────────────────────────

export const inventoryCreateSchema = z.object({
  name: z.string().min(1, "Tên vật tư là bắt buộc").max(200),
  item_code: z.string().max(20).optional(),
  category: z.enum(INVENTORY_CATEGORIES),
  unit: z.enum(INVENTORY_UNITS),
  min_stock: z.number().int().min(0).default(0),
  purchase_price: z.number().min(0).default(0),
  sale_price: z.number().min(0).default(0),
  supplier: z.string().max(200).optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export type CreateInventoryInput = z.infer<typeof inventoryCreateSchema>;

// ─── Update Schema (partial, requires id + updated_at) ──

export const inventoryUpdateSchema = z.object({
  id: z.string().uuid(),
  updated_at: z.string(), // Optimistic locking
  data: inventoryCreateSchema.partial(),
});

export type UpdateInventoryInput = z.infer<typeof inventoryUpdateSchema>;

// ─── Stock In Schema ─────────────────────────────────

export const stockInSchema = z.object({
  itemId: z.string().uuid("ID vật tư không hợp lệ"),
  quantity: z.number().int().min(1, "Số lượng phải ≥ 1"),
  unitCost: z.number().min(0, "Đơn giá không hợp lệ").default(0),
  supplier: z.string().max(200).optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export type StockInInput = z.infer<typeof stockInSchema>;

// ─── Stock Out Schema ────────────────────────────────

export const stockOutSchema = z.object({
  itemId: z.string().uuid("ID vật tư không hợp lệ"),
  quantity: z.number().int().min(1, "Số lượng phải ≥ 1"),
  contractId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});

export type StockOutInput = z.infer<typeof stockOutSchema>;

export const inventoryListFiltersSchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.enum(INVENTORY_FILTER_CATEGORIES).optional(),
  status: z.enum(INVENTORY_FILTER_STATUSES).optional(),
  sort: z.enum(INVENTORY_SORTS).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
});

export const transactionFiltersSchema = z
  .object({
    type: z.enum(["stock_in", "stock_out", "all"]).optional(),
    item_id: z.string().uuid().optional(),
    contract_id: z.string().uuid().optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).max(10000).optional(),
  })
  .refine(
    (value) =>
      !value.start_date ||
      !value.end_date ||
      new Date(value.start_date).getTime() <= new Date(value.end_date).getTime(),
    {
      message: "Ngày bắt đầu phải trước ngày kết thúc",
      path: ["end_date"],
    },
  );

export const inventoryPickerFiltersSchema = z.object({
  search: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  activeOnly: z.boolean().optional(),
});

export const inventoryUuidSchema = z.string().uuid("ID vật tư không hợp lệ");
