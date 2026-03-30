/**
 * 📦 Service Zod Schemas — V2 Gold Standard
 *
 * Validates service form submissions before DB operations.
 * DB table: services
 *
 * @see Lesson #72: FK *_by → auth.users(id)
 * @see Lesson #89-90: Group B VARCHAR + TS enum pattern
 */

import { z } from "zod";
import { SERVICE_TYPES, SERVICE_STATUSES, SERVICE_UNITS, FULFILLMENT_TYPES } from "@/types/service-constants";

// ─── Create Schema ──────────────────────────────

export const serviceCreateSchema = z.object({
  name: z.string().min(1, "Tên dịch vụ là bắt buộc").max(200),
  service_code: z.string().max(30).optional(),
  service_type: z.enum(SERVICE_TYPES).default("studio"),
  category_id: z.string().uuid().optional().or(z.literal("")),
  selling_price: z.number().min(0, "Giá bán không hợp lệ").default(0),
  cost_price: z.number().min(0, "Giá vốn không hợp lệ").default(0),
  unit: z.enum(SERVICE_UNITS).default("dich_vu"),
  fulfillment_type: z.enum(FULFILLMENT_TYPES).default("single"),
  status: z.enum(SERVICE_STATUSES).default("active"),
  description: z.string().max(10000).optional(),
  image_url: z.string().url().optional().or(z.literal("")),
});

export type CreateServiceInput = z.infer<typeof serviceCreateSchema>;

// ─── Update Schema (requires id + updated_at for optimistic lock) ──

export const serviceUpdateSchema = z.object({
  id: z.string().uuid(),
  updated_at: z.string(), // Optimistic locking
  data: serviceCreateSchema.partial(),
});

export type UpdateServiceInput = z.infer<typeof serviceUpdateSchema>;

// ─── Bundle Item Schema ─────────────────────────

export const bundleItemSchema = z.object({
  child_service_id: z.string().uuid("ID dịch vụ con không hợp lệ"),
  quantity: z.number().int().min(1, "Số lượng phải ≥ 1").default(1),
  adjustment_price: z.number().default(0),
  sort_order: z.number().int().min(0).default(0),
});

export type BundleItemInput = z.infer<typeof bundleItemSchema>;
