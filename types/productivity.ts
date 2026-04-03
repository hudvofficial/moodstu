import type { EmployeeRole } from "@/types/employee";
import type { Role } from "@/types/roles";

export type ProductivityPeriod = "week" | "month" | "quarter";
export type WorkloadLevel = "low" | "medium" | "high" | "overloaded";
export type ProductivityViewMode = "team" | "self";
export type ProductivitySortKey =
  | "default"
  | "active_tasks"
  | "completed_tasks"
  | "overdue_tasks"
  | "total_cost";
export type ProductivitySortDirection = "asc" | "desc";

export interface ProductivityDateRange {
  start: string;
  end: string;
}

export interface EmployeeProductivity {
  employee_id: string;
  full_name: string;
  role: EmployeeRole;
  onsite_hours: number;
  active_tasks: number;
  completed_tasks: number;
  post_production_active: number;
  overdue_tasks: number;
  total_cost: number | null;
  workload_level: WorkloadLevel;
  workload_ratio: number;
}

export interface EmployeeJobTask {
  work_type: string;
  status: string;
  deadline: string | null;
  cost: number | null;
}

export interface EmployeeJobGroup {
  contract_id: string;
  contract_code: string;
  client_name: string;
  service_type: string;
  event_date: string | null;
  tasks: EmployeeJobTask[];
  total_cost: number | null;
  completed: number;
  active: number;
  overdue: number;
}

export interface ProductivitySummary {
  total_onsite_hours: number;
  total_active_tasks: number;
  total_completed_tasks: number;
  total_overdue_tasks: number;
  overloaded_count: number;
  completion_rate: number;
  total_cost: number | null;
}

export interface ProductivityData {
  employees: EmployeeProductivity[];
  summary: ProductivitySummary;
  period: ProductivityPeriod;
  date_range: ProductivityDateRange;
}

export interface ProductivityViewer {
  role: Role;
  viewMode: ProductivityViewMode;
  currentEmployeeId: string | null;
  canViewCost: boolean;
  timezone: string;
  isLinkedEmployee: boolean;
}

export interface ProductivityPagePayload {
  viewer: ProductivityViewer;
  overview: ProductivityData;
  initialDetail?: EmployeeJobGroup[];
}
