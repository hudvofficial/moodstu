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

function isIsoDate(value: string | null | undefined) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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
  "outsource",
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
}).superRefine((data, ctx) => {
  const contractDate = data.contract_date;
  const workDate = data.work_date;
  const deliveryDate = data.delivery_date;

  if (isIsoDate(contractDate) && isIsoDate(workDate) && workDate < contractDate) {
    ctx.addIssue({
      code: "custom",
      path: ["work_date"],
      message: "Ngay lam phai sau hoac bang ngay ky hop dong",
    });
  }

  if (isIsoDate(workDate) && isIsoDate(deliveryDate) && deliveryDate < workDate) {
    ctx.addIssue({
      code: "custom",
      path: ["delivery_date"],
      message: "Ngay giao phai sau hoac bang ngay lam",
    });
  }

  if (
    isIsoDate(contractDate) &&
    isIsoDate(deliveryDate) &&
    deliveryDate < contractDate
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["delivery_date"],
      message: "Ngay giao phai sau hoac bang ngay ky hop dong",
    });
  }
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

const contractScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  eventType: z.enum(["ngay_chup", "ngay_to_chuc"]),
  title: z.string().trim().min(1, "Tên sự kiện là bắt buộc"),
  date: z.iso.date("Ngày sự kiện không hợp lệ"),
  isPrimaryWeddingDate: z.boolean().optional(),
  sortOrder: z.number().int().positive(),
});

// ─── Full Submission Schema ──────────────────────────────

export const contractSubmissionSchema = z.object({
  formData: contractFormDataSchema,
  items: z.array(formLineItemSchema).min(1, "Phải có ít nhất 1 dịch vụ"),
  paymentInfo: formPaymentInfoSchema,
  financials: contractFinancialsSchema,
  weddingDate: z.string().optional(),
  schedules: z.array(contractScheduleSchema).optional(),
  existingContractId: z.string().optional(),
  expectedUpdatedAt: z.string().optional(), // optimistic lock
}).superRefine((data, ctx) => {
  const requiresWeddingDate = data.formData.service_type === "studio" || data.formData.service_type === "combo";
  if (requiresWeddingDate && !data.existingContractId && !data.weddingDate?.trim() && !data.schedules?.length) {
    ctx.addIssue({
      code: "custom",
      path: ["weddingDate"],
      message: "Ngày cưới là bắt buộc với hợp đồng Studio/Combo mới",
    });
  }

  if (!data.schedules) return;

  const seen = new Set<string>();
  const ceremonies = data.schedules.filter((item) => item.eventType === "ngay_to_chuc");
  const shoots = data.schedules.filter((item) => item.eventType === "ngay_chup");
  const needsCeremony = ["studio", "combo", "ngay_cuoi"].includes(data.formData.service_type);
  const needsShoot = data.formData.service_type !== "ngay_cuoi" && data.formData.service_type !== "outsource";

  data.schedules.forEach((schedule, index) => {
    const key = `${schedule.eventType}:${schedule.date}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["schedules", index, "date"],
        message: "Không thể tạo hai sự kiện cùng loại trong cùng một ngày",
      });
    }
    seen.add(key);
  });

  if (needsShoot && shoots.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["schedules"],
      message: "Hợp đồng cần ít nhất một ngày chụp",
    });
  }
  if (needsCeremony && ceremonies.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["schedules"],
      message: "Hợp đồng cần ít nhất một ngày tổ chức",
    });
  }
  if (ceremonies.length > 0 && ceremonies.filter((item) => item.isPrimaryWeddingDate).length !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["schedules"],
      message: "Cần chọn đúng một ngày cưới chính",
    });
  }
});

export type ValidatedContractSubmission = z.infer<
  typeof contractSubmissionSchema
>;
