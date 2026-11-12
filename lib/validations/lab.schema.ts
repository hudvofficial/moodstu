import { z } from "zod";
import { LAB_STATUSES } from "@/types/printing-constants";

// Lab payment uses printing system payment methods (English, 4 options)
const labPaymentMethodSchema = z.enum(["cash", "transfer", "card", "other"]);

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const labStatusSchema = z.enum(LAB_STATUSES);

export const createLabSchema = z.object({
  lab_name: z.string().trim().min(1, "Ten lab la bat buoc"),
  contact_person: optionalText,
  phone: optionalText,
  address: optionalText,
  status: labStatusSchema.default("active"),
});

export const updateLabSchema = z.object({
  lab_name: z.string().trim().min(1, "Ten lab la bat buoc").optional(),
  contact_person: optionalText,
  phone: optionalText,
  address: optionalText,
  status: labStatusSchema.optional(),
});

export const createLabServiceSchema = z.object({
  lab_id: z.string().uuid("Lab khong hop le"),
  item_name: z.string().trim().min(1, "Ten dich vu la bat buoc"),
  cost_price: z.number().min(0, "Gia dich vu khong duoc am"),
  // T-20261112: map sang SKU chung (null = chưa map)
  product_id: z.string().uuid("San pham khong hop le").nullable().optional(),
  // null = dùng giá bán mặc định của SKU; 0 là giá hợp lệ
  selling_price_override: z
    .union([z.number().min(0, "Gia ban khong duoc am"), z.null()])
    .optional(),
});

export const updateLabServiceSchema = z.object({
  item_name: z.string().trim().min(1, "Ten dich vu la bat buoc"),
  cost_price: z.number().min(0, "Gia dich vu khong duoc am"),
  product_id: z.string().uuid("San pham khong hop le").nullable().optional(),
  selling_price_override: z
    .union([z.number().min(0, "Gia ban khong duoc am"), z.null()])
    .optional(),
  // Optimistic token (spec §9.5)
  expected_updated_at: z.string().optional(),
});

export const labPaymentSchema = z.object({
  lab_id: z.string().uuid("Lab khong hop le"),
  amount: z.number().positive("So tien thanh toan phai lon hon 0"),
  payment_method: labPaymentMethodSchema.default("transfer"),
  // ADR-016 luật ngày: ngày trả nhập trên phiếu. Trước đây modal gửi payment_date nhưng
  // schema không khai → zod strip → 22/26 lần trả lab bị ghi ngày nhập (25/08).
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay thanh toan khong hop le")
    .optional(),
  note: optionalText,
  allocations: z
    .array(
      z.object({
        printing_order_id: z.string().uuid("Don in khong hop le"),
        amount: z.number().positive("So tien phan bo phai lon hon 0"),
      }),
    )
    .optional(),
});

// ─── CATALOG SKU + GIÁ BÁN LAB (T-20261112) ───

const priceVnd = z
  .number({ message: "Giá phải là số" })
  .min(0, "Giá không được âm")
  .max(9_999_999_999_999, "Giá vượt giới hạn")
  .refine((value) => Number.isFinite(value), "Giá không hợp lệ");

/** Override NULL = dùng giá mặc định của SKU; 0 là giá hợp lệ. */
const optionalPriceVnd = z
  .union([priceVnd, z.null()])
  .optional()
  .transform((value) => (value === undefined ? null : value));

export const upsertPrintProductSchema = z.object({
  // id null/thiếu = tạo mới
  id: z.string().uuid("SKU không hợp lệ").nullable().optional(),
  sku: z.string().trim().min(1, "Mã SKU là bắt buộc").max(64, "Mã SKU quá dài"),
  name: z.string().trim().min(1, "Tên sản phẩm là bắt buộc").max(255),
  category: optionalText,
  specification: optionalText,
  unit: optionalText,
  default_selling_price: priceVnd,
  active: z.boolean().default(true),
  // Optimistic token khi sửa (bỏ trống khi tạo mới)
  expected_updated_at: z.string().optional(),
});

export const upsertLabProductPriceSchema = z.object({
  // id null/thiếu = tạo dòng giá mới cho Lab
  id: z.string().uuid("Dòng giá không hợp lệ").nullable().optional(),
  lab_id: z.string().uuid("Lab không hợp lệ"),
  product_id: z.string().uuid("Sản phẩm không hợp lệ"),
  cost_price: priceVnd,
  selling_price_override: optionalPriceVnd,
  expected_updated_at: z.string().optional(),
});

export type LabStatus = z.infer<typeof labStatusSchema>;
export type ValidatedUpsertPrintProduct = z.infer<typeof upsertPrintProductSchema>;
export type ValidatedUpsertLabProductPrice = z.infer<typeof upsertLabProductPriceSchema>;
export type ValidatedCreateLab = z.infer<typeof createLabSchema>;
export type ValidatedUpdateLab = z.infer<typeof updateLabSchema>;
export type ValidatedCreateLabService = z.infer<typeof createLabServiceSchema>;
export type ValidatedUpdateLabService = z.infer<typeof updateLabServiceSchema>;
export type ValidatedLabPayment = z.infer<typeof labPaymentSchema>;
