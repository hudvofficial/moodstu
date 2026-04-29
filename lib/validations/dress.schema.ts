import { z } from "zod";

export const DRESS_CATEGORIES = [
  "vay_cuoi",
  "ao_dai",
  "vest",
  "vay_trap",
  "do_be",
  "vay_da_hoi",
  "phu_kien",
  "khac",
] as const;

export type DressCategory = (typeof DRESS_CATEGORIES)[number];

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

export const DRESS_CONDITIONS = ["new", "good", "fair", "worn"] as const;

export type DressCondition = (typeof DRESS_CONDITIONS)[number];

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

export const dressUpdateSchema = z.object({
  id: z.string().uuid(),
  updated_at: z.string(),
  data: dressCreateSchema.partial(),
});

export type UpdateDressInput = z.infer<typeof dressUpdateSchema>;

export const reserveDressSchema = z.object({
  dressId: z.string().uuid("ID trang phục không hợp lệ"),
  contractId: z.string().uuid("ID hợp đồng không hợp lệ"),
  contractItemId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().min(1, "Ngày bắt đầu là bắt buộc"),
  endDate: z.string().min(1, "Ngày kết thúc là bắt buộc"),
  exportType: z.enum(["xuat_ban", "xuat_thue"]).optional(),
  isAddon: z.boolean().default(false),
  rentalPrice: z.number().min(0).default(0),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["endDate"],
});

export type ReserveDressInput = z.infer<typeof reserveDressSchema>;
