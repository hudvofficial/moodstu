/**
 * 📦 Contract Form Types (V2)
 *
 * Form-specific types used by contract form hooks + components.
 * Separate from DB types (contract.ts) to keep concerns clean.
 *
 * @see useContractForm.ts (orchestrator)
 * @see useContractCustomer.ts, useContractItems.ts, useContractFinancials.ts
 */

import type { ServiceType, ContractStatus, ItemType, ExportType, PaymentMethod } from "./contract";
import type { AddonCategory } from "./addon-history";
import type { Customer } from "./crm";
import type { ContractScheduleInput } from "./contract-schedule";

// ─── FORM MODE ───────────────────────────────────────────

export type ContractFormMode = "create" | "edit";

// ─── ITEM MODAL MODE ────────────────────────────────────

export type ItemModalMode =
  | "add-service"
  | "add-addon"
  | "edit-service"
  | "edit-addon";

// ─── CONTRACT FORM DATA (main form fields) ──────────────

export interface ContractFormData {
  contract_code: string;
  customer_id: string;
  service_type: ServiceType;
  transaction_type: "hop_dong" | "hoa_don";
  contract_date: string;
  work_date: string;
  delivery_date: string;
  status: ContractStatus;
  notes: string;
  assigned_to: string;
  // Couple convenience fields
  bride_name: string;
  groom_name: string;
  // [V1 PORT] Couple detail fields (Phase 01 DB migration)
  bride_phone: string;
  bride_height: string;  // string for form input, convert on submit
  bride_weight: string;
  bride_shoe_size: string;
  groom_phone: string;
  groom_height: string;
  groom_weight: string;
  groom_shoe_size: string;
}

// ─── ITEM FORM DATA (single item in form) ───────────────

export interface ContractItemFormData {
  /** Temp client-side ID for tracking (uuid or index) */
  _tempId: string;
  /** Existing DB ID (only for edit mode) */
  id?: string;
  service_id: string | null;
  dress_id: string | null;
  item_name: string;
  type: ItemType;
  export_type: ExportType;
  is_addon: boolean;
  addon_category: AddonCategory | null;
  quantity: number;
  unit_price: number;
  original_price: number | null;
  discount_amount: number;
  total_amount: number;
  notes: string;
}

// ─── PAYMENT FORM DATA (CREATE mode only) ───────────────

export interface ContractPaymentFormData {
  amount: number;
  payment_method: PaymentMethod;
  payment_stage: string;
  notes: string;
}

// ─── FINANCIALS (calculated totals) ─────────────────────

export interface ContractFinancials {
  /** Sum of all item total_amount */
  subtotal: number;
  /** Contract-level discount */
  discount: number;
  /** subtotal - discount */
  totalAmount: number;
  /** Sum of existing payments (read-only on edit) */
  paidAmount: number;
  /** totalAmount - paidAmount */
  remainingAmount: number;
}

// ─── SELECTED CUSTOMER (with display info) ──────────────

export interface SelectedCustomer {
  id: string;
  full_name: string;
  phone: string | null;
  bride_name: string | null;
  groom_name: string | null;
  // [V1 PORT] Couple detail fields
  bride_phone: string | null;
  bride_height: number | null;
  bride_weight: number | null;
  bride_shoe_size: number | null;
  groom_phone: string | null;
  groom_height: number | null;
  groom_weight: number | null;
  groom_shoe_size: number | null;
  wedding_date: string | null;
  address: string | null;
}

// ─── FORM INITIAL DATA (for edit mode pre-fill) ─────────

export interface ContractEditData {
  contract: ContractFormData;
  items: ContractItemFormData[];
  schedules: ContractScheduleInput[];
  customer: Customer;
  paidAmount: number;
  updatedAt: string; // for optimistic lock
}

// ─── WEDDING SERVICE TYPES (show couple fields) ─────────

export const WEDDING_SERVICE_TYPES: ServiceType[] = [
  "studio",
  "ngay_cuoi",
  "combo",
];

/** Show bride/groom fields for these service types */
export function showCoupleFields(serviceType: ServiceType): boolean {
  return WEDDING_SERVICE_TYPES.includes(serviceType);
}

export function showWeddingDate(serviceType: ServiceType): boolean {
  return WEDDING_SERVICE_TYPES.includes(serviceType);
}

export function workDateLabel(serviceType: ServiceType): string {
  switch (serviceType) {
    case "ngay_cuoi":
      return "Ngày tổ chức lễ";
    case "combo":
      return "Ngày chụp prewedding";
    case "media":
    case "khac":
      return "Ngày thực hiện";
    case "outsource":
      return "Ngày nhận source";
    default:
      return "Ngày chụp";
  }
}

// ─── SERVICE TYPE LABELS (SSOT) ─────────────────────────

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  studio: "Studio",
  ngay_cuoi: "Ngày cưới",
  combo: "Combo",
  baby: "Baby / Kid",
  gia_dinh: "Gia đình",
  sinh_nhat: "Sinh nhật",
  bau: "Bầu",
  concept: "Concept",
  couple: "Couple",
  ky_yeu: "Kỷ yếu",
  media: "Media",
  outsource: "Outsource (Gia công)",
  khac: "Khác",
};

// ─── SERVICE TYPE GROUPS (V1 Port — grouped dropdown) ────

export interface ServiceTypeGroup {
  groupName: string;
  color: "gold" | "rose" | "sky";
  types: ServiceType[];
}

export const SERVICE_TYPE_GROUPS: ServiceTypeGroup[] = [
  {
    groupName: "Moodstudio",
    color: "gold",
    types: ["studio", "ngay_cuoi", "combo"],
  },
  {
    groupName: "Photo",
    color: "rose",
    types: ["baby", "gia_dinh", "sinh_nhat", "bau", "concept", "couple", "ky_yeu"],
  },
  {
    groupName: "Media",
    color: "sky",
    types: ["media", "outsource", "khac"],
  },
];
