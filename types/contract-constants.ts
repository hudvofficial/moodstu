/**
 * 📦 Contract Constants (V2)
 *
 * Maps snake_case DB ENUMs → Vietnamese display labels.
 * THIS IS THE DISPLAY LAYER — DB stores snake_case, UI shows Vietnamese.
 *
 * @see Lesson #65: V2 DB ENUM snake_case → map to Vietnamese at display layer
 */

import type { ContractStatus, ServiceType, PaymentStatus } from "./contract";

// ─── STATUS DISPLAY MAP (snake_case → Vietnamese) ────────

export const CONTRACT_STATUS_MAP: Record<
  ContractStatus,
  { label: string; variant: "info" | "warning" | "success" | "error" }
> = {
  dang_thuc_hien: { label: "Đang thực hiện", variant: "info" },
  cho_xu_ly: { label: "Chờ xử lý", variant: "warning" },
  hoan_thanh: { label: "Hoàn thành", variant: "success" },
  da_huy: { label: "Đã hủy", variant: "error" },
};

// ─── PAYMENT STATUS DISPLAY MAP ──────────────────────────

export const PAYMENT_STATUS_MAP: Record<PaymentStatus, string> = {
  chua_thanh_toan: "Chưa thanh toán",
  da_coc: "Đã cọc",
  thanh_toan_mot_phan: "Thanh toán một phần",
  da_thanh_toan: "Đã thanh toán",
  hoan_tien: "Hoàn tiền",
};

// ─── SERVICE TYPE DISPLAY MAP (snake_case → Vietnamese) ──

export const SERVICE_TYPE_MAP: Record<
  ServiceType,
  { label: string; icon: string }
> = {
  studio: { label: "Studio", icon: "Camera" },
  ngay_cuoi: { label: "Ngày Cưới", icon: "Heart" },
  combo: { label: "Combo", icon: "Package" },
  baby: { label: "Baby", icon: "Baby" },
  gia_dinh: { label: "Gia đình", icon: "Users" },
  sinh_nhat: { label: "Sinh Nhật", icon: "Cake" },
  bau: { label: "Bầu", icon: "Heart" },
  concept: { label: "Concept", icon: "Palette" },
  couple: { label: "Couple", icon: "HeartHandshake" },
  ky_yeu: { label: "Kỷ yếu", icon: "GraduationCap" },
  media: { label: "Media", icon: "Film" },
  khac: { label: "Khác", icon: "MoreHorizontal" },
};

// ─── HELPER: Get display label ───────────────────────────

export function getStatusLabel(status: ContractStatus): string {
  return CONTRACT_STATUS_MAP[status]?.label || status;
}

export function getServiceLabel(type: ServiceType): string {
  return SERVICE_TYPE_MAP[type]?.label || type;
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_MAP[status] || status;
}
