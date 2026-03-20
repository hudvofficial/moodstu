/**
 * 📦 Contract Constants (V2)
 *
 * Maps snake_case DB ENUMs → Vietnamese display labels.
 * THIS IS THE DISPLAY LAYER — DB stores snake_case, UI shows Vietnamese.
 * THIS FILE IS THE SSOT — All components import from here, NO local hardcode.
 *
 * @see Lesson #65: V2 DB ENUM snake_case → map to Vietnamese at display layer
 */

import type {
  ContractStatus,
  ServiceType,
  PaymentStatus,
  EventType,
  WorkType,
  TaskStatus,
} from "./contract";

// ─── CONTRACT STATUS MAP (snake_case → Vietnamese) ───────

export const CONTRACT_STATUS_MAP: Record<
  ContractStatus,
  { label: string; variant: "info" | "warning" | "success" | "error" }
> = {
  dang_thuc_hien: { label: "Đang thực hiện", variant: "info" },
  cho_xu_ly: { label: "Chờ xử lý", variant: "warning" },
  hoan_thanh: { label: "Hoàn thành", variant: "success" },
  da_huy: { label: "Đã hủy", variant: "error" },
};

// ─── PAYMENT STATUS MAP ──────────────────────────────────

export const PAYMENT_STATUS_MAP: Record<PaymentStatus, string> = {
  chua_thanh_toan: "Chưa thanh toán",
  da_coc: "Đã cọc",
  thanh_toan_mot_phan: "Thanh toán một phần",
  da_thanh_toan: "Đã thanh toán",
  hoan_tien: "Hoàn tiền",
};

// ─── SERVICE TYPE MAP (snake_case → Vietnamese) ──────────

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

// ─── EVENT TYPE MAP (match DB event_type_enum) ───────────
// Used by: drawer-event-timeline, detail/event-timeline

export const EVENT_TYPE_MAP: Record<
  EventType,
  { label: string; icon: string; color: string; order: number }
> = {
  chuan_bi: { label: "Chuẩn Bị", icon: "📋", color: "text-teal-600", order: 0 },
  ngay_chup: { label: "Ngày Chụp", icon: "📸", color: "text-blue-600", order: 1 },
  ngay_to_chuc: { label: "Ngày Tổ Chức", icon: "💒", color: "text-purple-600", order: 2 },
  hau_ky: { label: "Hậu Kỳ", icon: "✏️", color: "text-amber-600", order: 3 },
  giao_san_pham: { label: "Giao Sản Phẩm", icon: "📦", color: "text-green-600", order: 4 },
};

// ─── WORK TYPE MAP (match DB work_type_enum) ─────────────
// Used by: drawer-assignments, detail/task views

export const WORK_TYPE_MAP: Record<WorkType, string> = {
  concept: "Concept",
  kich_ban: "Kịch bản",
  chup_anh: "Chụp ảnh",
  quay_phim: "Quay phim",
  makeup: "Trang điểm",
  tro_ly: "Trợ lý",
  cameraman: "Cameraman",
  hau_ky_anh: "Hậu kỳ Ảnh",
  dung_phim: "Dựng phim",
  retouch: "Retouch",
  premiere: "Premiere",
  bien_tap: "Biên tập",
  khac: "Khác",
};

// ─── TASK STATUS MAP (match DB task_status_enum) ─────────
// Used by: drawer-assignments, drawer-checklist, event-timeline

export const TASK_STATUS_MAP: Record<
  TaskStatus,
  { label: string; variant: "info" | "warning" | "success" | "error" | "muted" }
> = {
  chua_lam: { label: "Chờ", variant: "muted" },
  dang_lam: { label: "Đang làm", variant: "warning" },
  hoan_thanh: { label: "Xong", variant: "success" },
  da_huy: { label: "Hủy", variant: "error" },
};

// ─── HELPER: Get display labels ──────────────────────────

export function getStatusLabel(status: ContractStatus): string {
  return CONTRACT_STATUS_MAP[status]?.label || status;
}

export function getServiceLabel(type: ServiceType): string {
  return SERVICE_TYPE_MAP[type]?.label || type;
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_MAP[status] || status;
}

export function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_MAP[type]?.label || type;
}

export function getWorkTypeLabel(type: WorkType): string {
  return WORK_TYPE_MAP[type] || type;
}

export function getTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_MAP[status]?.label || status;
}

// ─── PAYMENT METHOD MAP ──────────────────────────────
// Used by: financial-dashboard, payment-history, ContractPaymentSection

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Chuyển khoản",
};

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_MAP[method] || method;
}

// ─── PAYMENT STAGE MAP ───────────────────────────────
// Used by: ContractPaymentSection

export const PAYMENT_STAGE_MAP: Record<string, string> = {
  dat_coc: "Đặt cọc",
  thanh_toan_dot_1: "Thanh toán đợt 1",
  thanh_toan_dot_2: "Thanh toán đợt 2",
  tat_toan: "Tất toán",
};

export function getPaymentStageLabel(stage: string): string {
  return PAYMENT_STAGE_MAP[stage] || stage;
}

// ─── ITEM TYPE MAP ───────────────────────────────────
// Used by: service-details-block, ContractItemsSection

export const ITEM_TYPE_MAP: Record<string, string> = {
  dich_vu: "Dịch vụ",
  san_pham: "Sản phẩm",
  trang_phuc: "Trang phục",
  phat_sinh: "Phát sinh",
};

export function getItemTypeLabel(type: string): string {
  return ITEM_TYPE_MAP[type] || type;
}
