import { z } from "zod";

export const createReceiptSchema = z.object({
  receipt_date: z.string().date(),
  receipt_type: z.string().min(1, "Loại phiếu thu không được để trống"),
  payment_type: z.string().min(1, "Hình thức thanh toán không được để trống"),
  contract_id: z.string().uuid().optional().nullable(),
  receipt_amount: z.number().positive("Số tiền thu phải > 0"),
  notes: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
});

export const updateReceiptSchema = createReceiptSchema.partial();

export const updateReceiptWithLockSchema = updateReceiptSchema.extend({
  id: z.string().uuid(),
  updated_at: z.string().datetime().nullable().optional(), // For optimistic locking
  category_name: z.string().optional().nullable(),
});

export const createExpenseSchema = z.object({
  expense_date: z.string().date(),
  payment_method: z.enum(["tien_mat", "chuyen_khoan"]),
  category_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive("Số tiền chi phải > 0"),
  description: z.string().optional().nullable(),
  recipient: z.string().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const createDebtSchema = z.object({
  entity_name: z.string().min(1, "Tên đối tượng không được để trống"),
  entity_type: z.enum(["nha_cung_cap", "khach_hang", "nhan_vien", "khac"]),
  type: z.enum(["Phải thu", "Phải trả"]),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  due_date: z.string().date().optional().nullable(),
  notes: z.string().optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  status: z.enum(["dang_no", "da_thanh_toan", "open", "closed", "partial"]).default("open"),
  installment_total: z.number().min(0).optional().nullable(),
  installment_amount: z.number().min(0).optional().nullable(),
  platform: z.string().optional().nullable(),
  card_id: z.string().uuid().optional().nullable(),
});

export const updateDebtSchema = createDebtSchema.partial();

const GOAL_ICON_VALUES = [
  "directions_car",
  "home",
  "photo_camera",
  "computer",
  "savings",
  "flight",
  "school",
  "storefront",
] as const;

const GOAL_COLOR_VALUES = ["emerald", "blue", "violet", "amber", "rose"] as const;

const GOAL_STATUS_VALUES = ["active", "completed", "cancelled", "canceled"] as const;

export const createGoalSchema = z.object({
  name: z.string().min(1, "Tên mục tiêu không để trống").trim(),
  target_amount: z.number().positive("Mục tiêu phải > 0"),
  deadline: z.string().date().optional().nullable(),
  icon: z.enum(GOAL_ICON_VALUES).optional().nullable(),
  color: z.enum(GOAL_COLOR_VALUES).optional().nullable(),
  notes: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional().nullable(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(GOAL_STATUS_VALUES).optional(),
});

export const upsertBudgetSchema = z.object({
  category_name: z.string().min(1, "Tên ngân sách không được để trống").trim(),
  budget_amount: z.number().positive("Ngân sách phải > 0"),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2024).max(2030),
});

export const createCloseSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format tháng phải là YYYY-MM"),
});

export const createInvestmentSchema = z.object({
  name: z.string().min(1, "Tên tài sản không được để trống").trim(),
  category: z.string().min(1, "Danh mục không được để trống"),
  purchase_date: z.string().date(),
  purchase_price: z.number().positive("Giá mua phải > 0"),
  useful_life_months: z.number().int().positive().optional(),
  depreciation_method: z.string().optional(),
  salvage_value: z.number().min(0).optional(),
  serial_number: z.string().optional().nullable(),
  linked_revenue: z.number().min(0).optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  next_maintenance_date: z.string().date().optional().nullable(),
  maintenance_interval_days: z.number().int().positive().optional().nullable(),
});

export const updateInvestmentSchema = createInvestmentSchema.partial().extend({
  status: z.string().optional(),
  condition: z.string().optional(),
  linked_revenue: z.number().min(0).optional(),
  sold_price: z.number().min(0).optional().nullable(),
  sold_date: z.string().date().optional().nullable(),
});

// ─── W1: Fixed Cost Schema ──────────────────────
export const createFixedCostSchema = z.object({
  cost_name: z.string().min(1, "Tên chi phí không được để trống").trim(),
  cost_type: z.string().optional().nullable(),
  monthly_amount: z.number().positive("Số tiền hàng tháng phải lớn hơn 0"),
  deposit_amount: z.number().min(0).optional().nullable(),
  start_date: z.string().date().optional().nullable(),
  end_date: z.string().date().optional().nullable(),
  description: z.string().optional().nullable(),
  cost_code: z.string().optional(),
});

export const updateFixedCostSchema = createFixedCostSchema.partial();

// ─── W2: Payment Schema ─────────────────────────
export const createPaymentSchema = z.object({
  contractId: z.string().uuid("Contract ID không hợp lệ"),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  paymentDate: z.string().date(),
  paymentMethod: z.enum(["tien_mat", "chuyen_khoan"]),
  paymentStage: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentPlanId: z.string().uuid().optional().nullable(),
  updateTotal: z.boolean().default(false),
});

// ─── W6: Category Schema (audit fix) ────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống").trim(),
  type: z.enum(["Thu", "Chi"]),
  category_code: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ─── W7: Credit Card Schema ────────────────────────
export const createCreditCardSchema = z.object({
  bank_name: z.string().min(1, "Tên ngân hàng không được để trống").trim(),
  last_4: z.string().length(4, "Phải nhập đúng 4 số cuối").regex(/^\d+$/, "Chỉ chứa chữ số"),
  statement_day: z.number().int().min(1).max(31, "Ngày sao kê phải từ 1-31"),
  due_day: z.number().int().min(1).max(31, "Ngày thanh toán phải từ 1-31"),
  credit_limit: z.number().min(0, "Hạn mức phải >= 0").optional().nullable(),
});

export const updateCreditCardSchema = createCreditCardSchema.partial();
