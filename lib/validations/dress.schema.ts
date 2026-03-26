/**
 * 📦 Dress Zod Schemas (V2)
 *
 * Validates dress form submissions before DB operations.
 * DB table: inventory_items (filtered by category)
 *
 * @see Lesson #65: V2 DB snake_case ENUM, NOT Vietnamese strings
 * @see Lesson #72: FK *_by → auth.users(id)
 */

import { z } from "zod";

// ─── Categories (Vietnamese — user-facing, stored as varchar) ─

export const DRESS_CATEGORIES = [
  "Váy cưới",
  "Áo dài",
  "Vest",
  "Váy tráp",
  "Đồ bé",
  "Khác",
] as const;

export type DressCategory = (typeof DRESS_CATEGORIES)[number];

// ─── Status (English — stored in DB) ────────────────────────

export const DRESS_STATUSES = [
  "available",
  "reserved",
  "rented",
  "maintenance",
  "cleaning",
  "overdue",
  "retired",
] as const;

export type DressStatus = (typeof DRESS_STATUSES)[number];

// ─── Condition ───────────────────────────────────────────────

export const DRESS_CONDITIONS = [
  "new",
  "good",
  "fair",
  "worn",
] as const;

export type DressCondition = (typeof DRESS_CONDITIONS)[number];

// ─── Create Schema ──────────────────────────────────────────

export const dressCreateSchema = z.object({
  name: z.string().min(1, "Tên trang phục là bắt buộc").max(200),
  item_code: z.string().max(50).optional(),
  category: z.enum(DRESS_CATEGORIES),
  size: z.string().max(20).optional(),
  color: z.string().max(50).optional(),
  condition: z.enum(DRESS_CONDITIONS).default("new"),
  rental_price: z.number().min(0).default(0),
  sale_price: z.number().min(0).default(0),
  purchase_price: z.number().min(0).default(0),
  image_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export type CreateDressInput = z.infer<typeof dressCreateSchema>;

// ─── Update Schema (partial, requires id + updated_at for opt lock) ─

export const dressUpdateSchema = z.object({
  id: z.string().uuid(),
  updated_at: z.string(), // Optimistic locking
  data: dressCreateSchema.partial(),
});

export type UpdateDressInput = z.infer<typeof dressUpdateSchema>;

// ─── Reserve Dress Schema ───────────────────────────────────

export const reserveDressSchema = z.object({
  inventoryItemId: z.string().uuid("ID trang phục không hợp lệ"),
  contractId: z.string().uuid("ID hợp đồng không hợp lệ"),
  contractItemId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
  endDate: z.string().min(1, "Ngày kết thúc là bắt buộc"),
  exportType: z.enum(["xuat_ban", "xuat_thue"]).optional(),
  isAddon: z.boolean().default(false),
  rentalPrice: z.number().min(0).default(0),
  notes: z.string().max(1000).optional(),
});

export type ReserveDressInput = z.infer<typeof reserveDressSchema>;
