import type { BadgeVariant } from "@/components/ui/badge";

// ADR-014 (2026-08-24): in ấn là Mood ⇄ Lab đối tác thuần tuý — không "đặt cọc",
// không "giao khách" gắn ở đơn in (thuộc contract_events). da_in = lab đã in xong,
// hình vẫn ở bên lab; hoan_thanh = Mood đã nhận hình về.
export const PRINTING_ORDER_STATUSES = [
  "cho_xu_ly",
  "dang_in",
  "da_in",
  "hoan_thanh",
  "huy_don",
  "gap_su_co",      // Issue/blocked — requires reason
  "da_nhan",        // LEGACY: chỉ để đọc dữ liệu audit-log cũ, không còn ghi mới
  "da_huy",         // LEGACY: như trên
] as const;

export type PrintingOrderStatus = (typeof PRINTING_ORDER_STATUSES)[number];

// Trục A — bảng chuyển trạng thái hợp lệ (ADR-014). NGUỒN CHÂN LÝ DUY NHẤT: server
// action (printing-mutations.ts) và UI (status-select.tsx dropdown, lọc option) đều
// đọc từ đây — tránh lặp lại đúng lớp bug lệch từ vựng đã sửa (payment_status).
export const PRINTING_VALID_TRANSITIONS: Record<string, string[]> = {
  cho_xu_ly: ["dang_in", "huy_don", "gap_su_co"],
  dang_in: ["da_in", "huy_don", "gap_su_co"],
  da_in: ["hoan_thanh", "huy_don", "gap_su_co", "dang_in"],
  hoan_thanh: [],
  huy_don: [],
  gap_su_co: ["cho_xu_ly", "dang_in", "da_in", "hoan_thanh", "huy_don"],
  // Legacy — terminal, không còn ghi mới.
  da_nhan: [],
  da_huy: [],
};

export const PRINTING_PAYMENT_STATUSES = [
  "chua_thanh_toan",
  "da_thanh_toan",
] as const;

export type PrintingPaymentStatus =
  (typeof PRINTING_PAYMENT_STATUSES)[number];

export const LAB_STATUSES = ["active", "inactive"] as const;

export type LabStatus = (typeof LAB_STATUSES)[number];

export const PRINTING_PAGE_SIZE = 20;

export const PRINTING_STATUS_LABELS: Record<PrintingOrderStatus, string> = {
  cho_xu_ly: "Chờ xử lý",
  dang_in: "Đang in",
  da_in: "Đã in — bên lab",
  hoan_thanh: "Hoàn thành",
  huy_don: "Hủy đơn",
  gap_su_co: "Gặp sự cố",
  da_nhan: "Đã nhận",     // Legacy
  da_huy: "Đã hủy",       // Legacy
};

export const PRINTING_STATUS_VARIANTS: Record<
  PrintingOrderStatus,
  BadgeVariant
> = {
  cho_xu_ly: "warning",
  dang_in: "info",
  da_in: "primary",
  hoan_thanh: "success",
  huy_don: "error",
  gap_su_co: "error",
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
  return status === "cho_xu_ly" || status === "dang_in" || status === "gap_su_co";
}

// ─── PAYMENT STATUS (DB ↔ UI) ─────────────────────────────
// ADR-014: DB và UI giờ cùng 1 từ vựng tiếng Việt (chua_thanh_toan/da_thanh_toan,
// ghi bởi record_lab_payment_atomic + CHECK constraint) — không còn cần quy đổi
// English↔Vietnamese như trước. Giữ hàm này (đổi tên/chữ ký) để call site không vỡ.

export function toUIPaymentStatus(
  dbStatus: string | null | undefined,
): PrintingPaymentStatus {
  return dbStatus === "da_thanh_toan" ? "da_thanh_toan" : "chua_thanh_toan";
}

