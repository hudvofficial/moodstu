// ═══════════════════════════════════════════
// Employee Types — DB + Domain interfaces
// ═══════════════════════════════════════════

export type EmployeeRole = "admin" | "manager" | "sale" | "media" | "ctv";

export type EmployeeStatus = "active" | "inactive";

export interface SalaryInfo {
  base_salary?: number;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_name?: string;
  branch?: string;
}

export interface Employee {
  id: string;
  auth_user_id: string | null;
  employee_code: string;
  full_name: string;
  gender: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  department: string;
  position: string | null;
  role: EmployeeRole;
  status: string;
  salary_info: SalaryInfo | null;
  notes: string | null;
  start_date: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Subset for list page — lighter query
export type EmployeeListItem = Pick<
  Employee,
  | "id" | "employee_code" | "full_name" | "department" | "position"
  | "role" | "phone" | "email" | "status" | "gender" | "avatar_url"
  | "start_date" | "deleted_at"
>;

// Full data for detail page
export type EmployeeDetail = Employee;

// Active employee for assignment dropdowns
export interface ActiveEmployee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department: string;
  position: string | null;
}
