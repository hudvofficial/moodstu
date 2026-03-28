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
