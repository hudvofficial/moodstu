export const SERVICE_TYPES = [
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
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  studio: "Studio",
  ngay_cuoi: "Ngày cưới",
  combo: "Combo",
  baby: "Baby / Newborn",
  gia_dinh: "Gia đình",
  sinh_nhat: "Sinh nhật",
  bau: "Bầu / Maternity",
  concept: "Concept",
  couple: "Couple",
  ky_yeu: "Kỷ yếu",
  media: "Media / Video",
  outsource: "Outsource (Gia công)",
  khac: "Khác",
};

export const SERVICE_STATUSES = ["active", "inactive"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: "Đang kinh doanh",
  inactive: "Ngừng kinh doanh",
};

export const SERVICE_STATUS_VARIANTS: Record<ServiceStatus, string> = {
  active: "success",
  inactive: "muted",
};

export const SERVICE_UNITS = [
  "dich_vu",
  "goi",
  "bo",
  "lan",
  "ngay",
  "gio",
  "san_pham",
] as const;

export type ServiceUnit = (typeof SERVICE_UNITS)[number];

export const SERVICE_UNIT_LABELS: Record<ServiceUnit, string> = {
  dich_vu: "Dịch vụ",
  goi: "Gói",
  bo: "Bộ",
  lan: "Lần",
  ngay: "Ngày",
  gio: "Giờ",
  san_pham: "Sản phẩm",
};

export const FULFILLMENT_TYPES = ["single", "bundle"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  single: "Đơn lẻ",
  bundle: "Gói combo",
};

export const VIEW_MODES = ["list", "grid"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];
