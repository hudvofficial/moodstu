import type {
  ProductivityPeriod,
  ProductivitySortDirection,
  ProductivitySortKey,
  WorkloadLevel,
} from "@/types/productivity";

export const PRODUCTIVITY_ALLOWED_ROLES = [
  "admin",
  "manager",
  "media",
] as const;

export const PRODUCTIVITY_TEAM_ROLES = ["admin", "manager"] as const;

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
