/**
 * 📦 Contract Module Types (V2)
 *
 * V2 uses snake_case DB ENUMs, mapped to Vietnamese display labels.
 * @see Lesson #65: V2 DB snake_case ENUM, NOT Vietnamese strings
 * @see Lesson #66: V2 DB tables differ from V1
 */

// Re-export Customer from CRM (SSOT — avoid duplicate)
import type { Customer } from "./crm";
export type { Customer } from "./crm";

// ─── CONTRACT STATUS (match DB contract_status_enum) ─────
export type ContractStatus =
  | "cho_xu_ly"
  | "dang_thuc_hien"
  | "hoan_thanh"
  | "da_huy";

// ─── SERVICE TYPE (match DB service_type_enum) ───────────
export type ServiceType =
  | "studio"
  | "ngay_cuoi"
  | "combo"
  | "baby"
  | "gia_dinh"
  | "sinh_nhat"
  | "bau"
  | "concept"
  | "couple"
  | "ky_yeu"
  | "media"
  | "khac";

// ─── PAYMENT STATUS (match DB payment_status_enum) ───────
export type PaymentStatus =
  | "chua_thanh_toan"
  | "da_coc"
  | "thanh_toan_mot_phan"
  | "da_thanh_toan"
  | "hoan_tien";

// ─── EVENT TYPES (match DB event_type_enum) ──────────────
export type EventType = "chuan_bi" | "ngay_chup" | "ngay_to_chuc" | "hau_ky" | "giao_san_pham";

// ─── ITEM & PAYMENT TYPES (match DB enums) ───────────────
export type ItemType = "dich_vu" | "san_pham" | "trang_phuc" | "phat_sinh";
export type ExportType = "xuat_ban" | "xuat_thue" | null;
export type PaymentMethod = "tien_mat" | "chuyen_khoan";
export type TaskStatus = "chua_lam" | "dang_lam" | "hoan_thanh" | "da_huy";

// ─── WORK TYPES (match DB work_type_enum) ────────────────
export type WorkType =
  | "concept" | "kich_ban"
  | "chup_anh" | "quay_phim" | "makeup" | "tro_ly" | "cameraman"
  | "hau_ky_anh" | "dung_phim" | "retouch" | "premiere" | "bien_tap"
  | "khac";

// ─── CORE DATA MODELS (match V2 DB schema) ───────────────

/** Contract record from `contracts` table */
export interface Contract {
  id: string;
  contract_code: string;
  customer_id: string;
  service_type: ServiceType;
  transaction_type?: "hop_dong" | "hoa_don";
  contract_date: string | null;
  work_date: string | null;
  delivery_date: string | null;
  status: ContractStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  remaining_amount: number;
  description: string | null;
  notes: string | null;
  // Bride / Groom info (wedding contracts)
  bride_name: string | null;
  groom_name: string | null;
  bride_phone: string | null;
  groom_phone: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_by: string | null;
  assigned_to: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // FK joins (populated when selected)
  customers?: Customer | null;
  contract_items?: ContractItem[];
  contract_events?: ContractEvent[];
  work_tasks?: WorkTask[];
  contract_checklists?: ContractChecklist[];
}

/** Contract item from `contract_items` table */
export interface ContractItem {
  id: string;
  contract_id: string;
  type: ItemType;
  is_addon: boolean;
  addon_category: string | null;
  service_id: string | null;
  item_name: string;
  export_type: ExportType;
  quantity: number;
  unit_price: number;
  original_price: number | null;
  discount_amount: number;
  total_amount: number;
  inventory_item_id: string | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Contract event from `contract_events` table */
export interface ContractEvent {
  id: string;
  contract_id: string;
  event_type: EventType;
  title: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  status: TaskStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Work task from `work_tasks` table */
export interface WorkTask {
  id: string;
  contract_id: string;
  event_id: string | null;
  work_type: WorkType;
  assigned_to: string | null;
  status: TaskStatus;
  deadline: string | null;
  start_date: string | null;
  completion_date: string | null;
  cost: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  employees?: { id: string; full_name: string } | null;
}

/** Contract checklist from `contract_checklists` table */
export interface ContractChecklist {
  id: string;
  contract_id?: string;
  event_stage: string | null;
  category: string;
  item_name: string;
  is_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Payment from `payments` table */
export interface Payment {
  id: string;
  receipt_code: string | null;
  contract_id: string | null;
  customer_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  payment_stage: string | null;
  category_id: string | null;
  image_url: string | null;
  notes: string | null;
  approved_by: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── FILTER / PAGINATION ─────────────────────────────────

/** Filter state — synced to URL params */
export interface ContractFilters {
  search?: string;
  status?: ContractStatus | "all";
  service?: ServiceType | "all";
  time?: string;
  sort?: string;
  page?: number;
  startDate?: string;
  endDate?: string;
  advanced?: boolean;
}

/** Stats for contract list header */
export interface ContractStats {
  total: number;
  active: number;
  pending: number;
  completed: number;
  revenue: number;
  outstanding: number;
  growth: {
    total: number;
    active: number;
    pending: number;
    completed: number;
  };
}

// ─── SIDEBAR TYPES (Phase 04e) ───────────────────────────

/** Inventory reservation from `inventory_reservations` JOIN `inventory_items` */
export interface InventoryReservation {
  id: string;
  status: string | null;
  start_date: string;
  end_date: string;
  notes: string | null;
  inventory_items: {
    id: string;
    name: string;
    item_code: string | null;
    category: string | null;
    size: string | null;
    color: string | null;
    image_url: string | null;
  } | null;
}

/** Printing order from `printing_orders` JOIN `labs` */
export interface PrintingOrder {
  id: string;
  order_code: string | null;
  status: string | null;
  total_amount: number | null;
  order_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  labs: { id: string; name: string } | null;
}

/** Audit log from `audit_logs` JOIN `employees` */
export interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string | null;
  employees: { id: string; full_name: string } | null;
}

// ─── PAYMENT PLAN (Phase 00B) ────────────────────────────

/** Payment plan/milestone from `payment_plans` table */
export interface PaymentPlan {
  id: string;
  contract_id: string;
  stage_name: string;           // DB column: stage_name (NOT milestone_name)
  amount: number;
  due_date: string | null;
  status: string | null;        // "pending" | "paid" | "cancelled"
  receipt_id: string | null;    // FK → payments.id when paid
  created_at: string | null;
}

// ─── STUDIO INFO (Phase 00B) ─────────────────────────────

/** Studio info from `studio_info` table (single row) */
export interface StudioInfo {
  id: string;
  name: string;
  address: string | null;
  hotline: string | null;
  representative: string | null;
  logo_url: string | null;
  bank_info: Record<string, unknown> | null;
  social_links: Record<string, unknown> | null;
  working_hours: Record<string, unknown> | null;
  timezone: string | null;
  created_at: string | null;
  updated_at: string | null;
}
