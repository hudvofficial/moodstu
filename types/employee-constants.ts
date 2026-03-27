import type { EmployeeRole } from "./employee";

// ═══════════════════════════════════════════
// Employee Constants — Labels, Maps, Options
// SSOT for UI display. DB stores raw values.
// ═══════════════════════════════════════════

// ─── Department (predefined list, stored as VARCHAR in DB) ───
export const DEPARTMENT_OPTIONS = [
  { value: "Sản xuất", label: "Sản xuất" },
  { value: "Hậu kỳ", label: "Hậu kỳ" },
  { value: "Kinh doanh", label: "Kinh doanh" },
  { value: "Hậu cần", label: "Hậu cần" },
  { value: "CTV", label: "Cộng tác viên" },
  { value: "Quản lý", label: "Quản lý" },
] as const;

// ─── Role (DB ENUM: employee_role_enum) ────
export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: "Admin",
  manager: "Quản lý",
  sale: "Kinh doanh",
  media: "Media",
  ctv: "CTV",
};

export const ROLE_BADGE_MAP: Record<EmployeeRole, { label: string; variant: string }> = {
  admin: { label: "Admin", variant: "error" },
  manager: { label: "Quản lý", variant: "warning" },
  sale: { label: "Kinh doanh", variant: "info" },
  media: { label: "Media", variant: "success" },
  ctv: { label: "CTV", variant: "neutral" },
};

// ─── Gender (DB ENUM: gender_enum) ──────────
export const GENDER_OPTIONS = [
  { value: "nam", label: "Nam" },
  { value: "nu", label: "Nữ" },
  { value: "khac", label: "Khác" },
] as const;

// ─── Status (DB ENUM: employee_status_enum) ─
export const EMPLOYEE_STATUS_MAP: Record<string, { label: string; variant: string }> = {
  active: { label: "Đang làm", variant: "success" },
  inactive: { label: "Nghỉ việc", variant: "neutral" },
  on_leave: { label: "Nghỉ phép", variant: "warning" },
};

// ─── Helpers ────────────────────────────────
export function getDepartmentLabel(value: string): string {
  return DEPARTMENT_OPTIONS.find((d) => d.value === value)?.label || value;
}

export function getRoleLabel(role: EmployeeRole): string {
  return ROLE_LABELS[role] || role;
}

export function getStatusInfo(status: string) {
  return EMPLOYEE_STATUS_MAP[status] || { label: status, variant: "neutral" };
}
