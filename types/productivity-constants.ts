import type { BadgeVariant } from "@/components/ui/badge";
import type {
  ProductivityPeriod,
  ProductivitySortDirection,
  ProductivitySortKey,
  WorkloadLevel,
} from "@/types/productivity";

// ─── TASK STATUS (Productivity-specific descriptive labels) ──
// Intentionally different from contract-constants.ts compact labels ("Chờ"/"Xong")
// Productivity context needs full labels for manager review clarity

export const PRODUCTIVITY_TASK_LABELS: Record<string, string> = {
  chua_lam: "Chưa làm",
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
};

export const PRODUCTIVITY_TASK_VARIANTS: Record<string, BadgeVariant> = {
  chua_lam: "neutral",
  dang_lam: "info",
  hoan_thanh: "success",
  da_huy: "error",
};

export const PRODUCTIVITY_ALLOWED_ROLES = [
  "admin",
  "manager",
  "media",
] as const;

export const PRODUCTIVITY_TEAM_ROLES = ["admin", "manager"] as const;
export const PRODUCTIVITY_COST_ROLES = ["admin"] as const;

export const PERIOD_LABELS: Record<ProductivityPeriod, string> = {
  week: "Tuần này",
  month: "Tháng này",
  quarter: "Quý này",
};

export const MAX_TASKS_PER_WEEK = 8;
export const MAX_HOURS_PER_WEEK = 40;

export const WORKLOAD_THRESHOLDS = {
  medium: 0.4,
  high: 0.7,
  overloaded: 0.9,
} as const;

export const WORKLOAD_LABELS: Record<WorkloadLevel, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  overloaded: "Quá tải",
};

export const WORKLOAD_BADGE_VARIANTS: Record<
  WorkloadLevel,
  "neutral" | "info" | "warning" | "error"
> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  overloaded: "error",
};

// ─── Filter UI Constants (ported from Contract pattern) ─────
// Contract: STATUS_TABS → Productivity: WORKLOAD_FILTER_TABS
export const WORKLOAD_FILTER_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Quá tải", value: "overloaded" },
  { label: "Cao", value: "high" },
  { label: "Trung bình", value: "medium" },
  { label: "Thấp", value: "low" },
] as const;

// Contract: MOBILE_SORT_OPTIONS → Productivity: PRODUCTIVITY_SORT_OPTIONS
export const PRODUCTIVITY_SORT_OPTIONS = [
  { value: "default", label: "Sắp xếp" },
  { value: "overdue_desc", label: "Quá hạn nhiều" },
  { value: "hours_desc", label: "On-set nhiều" },
  { value: "cost_desc", label: "Chi phí cao" },
] as const;

// Contract: MOBILE_SERVICE_OPTIONS → Productivity: PRODUCTIVITY_ROLE_OPTIONS
// Only roles allowed in Productivity (matches PRODUCTIVITY_ALLOWED_ROLES)
export const PRODUCTIVITY_ROLE_OPTIONS = [
  { value: "all", label: "Vai trò" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Quản lý" },
  { value: "media", label: "Media" },
] as const;

export const DEFAULT_PRODUCTIVITY_SORT: {
  key: ProductivitySortKey;
  direction: ProductivitySortDirection;
} = {
  key: "default",
  direction: "desc",
};

export function isProductivityPeriod(
  value: string | undefined,
): value is ProductivityPeriod {
  return value === "week" || value === "month" || value === "quarter";
}
