/**
 * 📦 Contract Zod Schemas (V2)
 *
 * Validates contract form submissions before DB operations.
 * Prevents: Ghost Payment, financial drift, enum typos.
 *
 * ⚠️ ALL enum values match V2 DB snake_case ENUMs exactly.
 * DB: contract_status_enum, service_type_enum, item_type_enum, etc.
 */

import { z } from "zod";

// ─── Enum Validators (match DB ENUM exactly) ────────────

export const contractStatusSchema = z.enum([
  "cho_xu_ly",
  "dang_thuc_hien",
  "hoan_thanh",
  "da_huy",
]);

export const serviceTypeSchema = z.enum([
  "studio",
  "ngay_cuoi",
  "combo",
  "baby",
  "gia_dinh",
  "sinh_nhat",
  "bau",
  "concept",
  "couple",
  "ky_yeu",
  "media",
  "khac",
]);

export const itemTypeSchema = z.enum([
  "dich_vu",
  "san_pham",
  "trang_phuc",
  "phat_sinh",
]);

export const exportTypeSchema = z.enum(["xuat_ban", "xuat_thue"]).nullable();

export const paymentMethodSchema = z.enum(["tien_mat", "chuyen_khoan"]);

export const transactionTypeSchema = z.enum(["hop_dong", "hoa_don"]);

export const addonCategorySchema = z.enum([
  "makeup",
  "trang_phuc",
  "phu_kien",
  "them_gio",
  "khac",
]);

// ─── Form Data ──────────────────────────────────────────

const contractFormDataSchema = z.object({
  contract_code: z.string().min(1, "Mã hợp đồng là bắt buộc"),
  customer_id: z.string().uuid("Customer ID không hợp lệ"),
  service_type: serviceTypeSchema,
  transaction_type: transactionTypeSchema.default("hop_dong"),
  assigned_to: z.union([z.string().uuid("Employee ID khong hop le"), z.literal("")]).optional().default(""),
  contract_date: z.string().optional().default(""),
  work_date: z.string().optional().default(""),
  delivery_date: z.string().optional().default(""),
  status: contractStatusSchema,
  description: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  // Customer couple fields (convenience — also on customers table)
  bride_name: z.string().optional().default(""),
  groom_name: z.string().optional().default(""),
  // Couple detail fields (Phase 01 DB migration)
  bride_phone: z.string().optional().default(""),
  bride_height: z.string().optional().default(""),
  bride_weight: z.string().optional().default(""),
  bride_shoe_size: z.string().optional().default(""),
  groom_phone: z.string().optional().default(""),
  groom_height: z.string().optional().default(""),
  groom_weight: z.string().optional().default(""),
  groom_shoe_size: z.string().optional().default(""),
});

// ─── Line Items ──────────────────────────────────────────

const formLineItemSchema = z.object({
  id: z.string().optional(),
  service_id: z.string().nullable().optional(),
  dress_id: z.string().nullable().optional(),
  item_name: z.string().min(1, "Tên dịch vụ là bắt buộc"),
  quantity: z.number().min(1, "Số lượng phải ≥ 1"),
  unit_price: z.number().min(0, "Đơn giá phải ≥ 0"),
  original_price: z.number().nullable().optional(),
  discount_amount: z.number().min(0).default(0),
  total_amount: z.number().min(0),
  type: itemTypeSchema,
  export_type: exportTypeSchema.optional(),
  is_addon: z.boolean().optional().default(false),
  addon_category: addonCategorySchema.nullable().optional(),
  notes: z.string().optional().default(""),
});

// ─── Financials ──────────────────────────────────────────

const contractFinancialsSchema = z.object({
  total_amount: z.number().min(0),
  discount_amount: z.number().min(0),
  paid_amount: z.number().min(0),
  remaining_amount: z.number(),
});

// ─── Payment Info ────────────────────────────────────────

const formPaymentInfoSchema = z.object({
  amount: z.number().min(0),
  payment_method: paymentMethodSchema,
  payment_stage: z.string().optional().default(""),
  category_id: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

// ─── Full Submission Schema ──────────────────────────────

export const contractSubmissionSchema = z.object({
  formData: contractFormDataSchema,
  items: z.array(formLineItemSchema).min(1, "Phải có ít nhất 1 dịch vụ"),
  paymentInfo: formPaymentInfoSchema,
  financials: contractFinancialsSchema,
  existingContractId: z.string().optional(),
  expectedUpdatedAt: z.string().optional(), // optimistic lock
});

export type ValidatedContractSubmission = z.infer<
  typeof contractSubmissionSchema
>;
