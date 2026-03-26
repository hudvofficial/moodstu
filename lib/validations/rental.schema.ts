import { z } from "zod";

// ═══════════════════════════════════════════
// Rental Validation Schemas
// DB: dress_rentals + dress_rental_accessories
// ═══════════════════════════════════════════

// ─── Rental Status ───────────────────────────────────────────

export const RENTAL_STATUSES = [
  "reserved",
  "renting",
  "returned",
  "overdue",
  "cancelled",
] as const;

export type RentalStatus = (typeof RENTAL_STATUSES)[number];

// ─── Create Rental ───────────────────────────────────────────

export const createRentalSchema = z.object({
  item_id: z.string().uuid("ID trang phục không hợp lệ"),
  contract_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1, "Vui lòng nhập tên khách"),
  phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
  pickup_date: z.string().min(1, "Vui lòng chọn ngày lấy"),
  return_date: z.string().min(1, "Vui lòng chọn ngày trả"),
  rental_price: z.number().min(0).default(0),
  deposit: z.number().min(0).default(0),
  accessories: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CreateRentalInput = z.infer<typeof createRentalSchema>;

// ─── Return Dress ────────────────────────────────────────────

export const returnDressSchema = z.object({
  rental_id: z.string().uuid("ID đơn thuê không hợp lệ"),
  return_condition: z.enum(["good", "minor_damage", "major_damage"]),
  damage_fee: z.number().min(0).default(0),
  deposit_returned: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

export type ReturnDressInput = z.infer<typeof returnDressSchema>;
