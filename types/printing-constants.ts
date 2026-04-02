import type { BadgeVariant } from "@/components/ui/badge";

export const PRINTING_ORDER_STATUSES = [
  "cho_xu_ly",
  "dang_in",
  "da_in",
  "da_nhan",
  "da_huy",
] as const;

export type PrintingOrderStatus = (typeof PRINTING_ORDER_STATUSES)[number];

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
  da_in: "Đã in",
  da_nhan: "Đã nhận",
  da_huy: "Đã hủy",
};

export const PRINTING_STATUS_VARIANTS: Record<
  PrintingOrderStatus,
  BadgeVariant
> = {
  cho_xu_ly: "warning",
  dang_in: "info",
  da_in: "primary",
  da_nhan: "success",
  da_huy: "error",
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

