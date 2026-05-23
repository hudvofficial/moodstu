import type { BadgeVariant } from "@/components/ui/badge";

export const PRINTING_ORDER_STATUSES = [
  "cho_xu_ly",
  "dat_coc",        // Phase 2: After deposit payment
  "dang_in",
  "da_in",
  "da_giao",        // Phase 2: After delivery
  "hoan_thanh",     // Phase 2: After final payment (completed)
  "huy_don",        // Phase 2: Cancelled
  "da_nhan",        // LEGACY: Keep for backward compatibility
  "da_huy",         // LEGACY: Keep for backward compatibility
] as const;

export type PrintingOrderStatus = (typeof PRINTING_ORDER_STATUSES)[number];

export const PRINTING_PAYMENT_STATUSES = [
  "chua_thanh_toan",
  "da_thanh_toan",
] as const;

export type PrintingPaymentStatus =
  (typeof PRINTING_PAYMENT_STATUSES)[number];

// Database payment statuses (English)
export const DB_PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;
export type DBPaymentStatus = (typeof DB_PAYMENT_STATUSES)[number];

export const LAB_STATUSES = ["active", "inactive"] as const;

export type LabStatus = (typeof LAB_STATUSES)[number];

export const PRINTING_PAGE_SIZE = 20;

export const PRINTING_STATUS_LABELS: Record<PrintingOrderStatus, string> = {
  cho_xu_ly: "Chờ xử lý",
  dat_coc: "Đã đặt cọc",
  dang_in: "Đang in",
  da_in: "Đã in",
  da_giao: "Đã giao",
  hoan_thanh: "Hoàn thành",
  huy_don: "Hủy đơn",
  da_nhan: "Đã nhận",     // Legacy
  da_huy: "Đã hủy",       // Legacy
};

export const PRINTING_STATUS_VARIANTS: Record<
  PrintingOrderStatus,
  BadgeVariant
> = {
  cho_xu_ly: "warning",
  dat_coc: "info",
  dang_in: "info",
  da_in: "primary",
  da_giao: "success",
  hoan_thanh: "success",
  huy_don: "error",
  da_nhan: "success",     // Legacy
  da_huy: "error",        // Legacy
};

export const PRINTING_PAYMENT_LABELS: Record<PrintingPaymentStatus, string> = {
  chua_thanh_toan: "Chưa thanh toán",
  da_thanh_toan: "Đã thanh toán",
};

export const PRINTING_PAYMENT_VARIANTS: Record<
  PrintingPaymentStatus,
  BadgeVariant
> = {
  chua_thanh_toan: "warning",
  da_thanh_toan: "success",
};

export const LAB_STATUS_LABELS: Record<LabStatus, string> = {
  active: "Đang hoạt động",
  inactive: "Tạm dừng",
};

export const LAB_STATUS_VARIANTS: Record<LabStatus, BadgeVariant> = {
  active: "success",
  inactive: "neutral",
};

export function isPrintingOrderStatus(
  value: string,
): value is PrintingOrderStatus {
  return PRINTING_ORDER_STATUSES.includes(value as PrintingOrderStatus);
}

export function normalizePrintingOrderStatus(
  value: string | null | undefined,
): PrintingOrderStatus {
  if (value && isPrintingOrderStatus(value)) return value;
  return "cho_xu_ly";
}

export function isPrintingPaymentStatus(
  value: string,
): value is PrintingPaymentStatus {
  return PRINTING_PAYMENT_STATUSES.includes(value as PrintingPaymentStatus);
}

export function normalizePrintingPaymentStatus(
  value: string | null | undefined,
): PrintingPaymentStatus {
  if (value && isPrintingPaymentStatus(value)) return value;
  return "chua_thanh_toan";
}

export function isLabStatus(value: string): value is LabStatus {
  return LAB_STATUSES.includes(value as LabStatus);
}

export function normalizeLabStatus(
  value: string | null | undefined,
): LabStatus {
  if (value && isLabStatus(value)) return value;
  return "active";
}

/** Status that means the order is still in-progress (eligible for overdue) */
export function isPendingPrintStatus(status: PrintingOrderStatus): boolean {
  return status === "cho_xu_ly" || status === "dat_coc" || status === "dang_in";
}

// ─── PAYMENT STATUS MAPPING (DB ↔ UI) ────────────────────

/**
 * Convert UI payment status (Vietnamese) to DB payment status (English)
 */
export function toDBPaymentStatus(
  uiStatus: PrintingPaymentStatus | string | null | undefined
): DBPaymentStatus {
  switch (uiStatus) {
    case "chua_thanh_toan":
      return "unpaid";
    case "da_thanh_toan":
      return "paid";
    default:
      return "unpaid";
  }
}

/**
 * Convert DB payment status (English) to UI payment status (Vietnamese)
 */
export function toUIPaymentStatus(
  dbStatus: string | null | undefined
): PrintingPaymentStatus {
  switch (dbStatus) {
    case "unpaid":
      return "chua_thanh_toan";
    case "partial":
      return "chua_thanh_toan"; // Partial treated as "not fully paid"
    case "paid":
      return "da_thanh_toan";
    default:
      return "chua_thanh_toan";
  }
}

