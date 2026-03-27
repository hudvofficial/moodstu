import type { EmployeeRole } from "./employee";

// ═══════════════════════════════════════════
// Employee Form Types — UI form state (≠ DB row)
// ═══════════════════════════════════════════

export interface EmployeeFormData {
  // Identity
  full_name: string;
  gender: string;
  phone: string;
  email: string;
  // Work
  department: string;
  position: string;
  role: EmployeeRole;
  start_date: string;
  // Salary (Admin only)
  base_salary: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
}

export const DEFAULT_FORM_DATA: EmployeeFormData = {
  full_name: "",
  gender: "nam",
  phone: "",
  email: "",
  department: "",
  position: "",
  role: "ctv",
  start_date: new Date().toISOString().split("T")[0],
  base_salary: "",
  bank_name: "",
  bank_account_no: "",
  bank_account_name: "",
};

// Fields allowed for update (whitelist — matches DB columns)
export const ALLOWED_FIELDS = [
  "employee_code", "full_name", "gender", "phone", "email",
  "department", "position", "role", "status", "start_date",
  "salary_info", "avatar_url", "notes",
] as const;
