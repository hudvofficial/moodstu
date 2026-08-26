// ADR-016 M2 — Công nợ phải trả hợp nhất (lab ảnh · thợ ngoài · NCC phôi).
// Nguồn: finance_payable_summary() / payable_items() / payee_payment_history() / record_payee_payment_atomic().

// M3 (T-20260826-tien-ekip-va-can-thu): thêm "employee" — ekip nội bộ trả theo task như thợ ngoài.
export const PAYEE_TYPES = ["lab", "vendor", "supplier", "employee"] as const;
export type PayeeType = (typeof PAYEE_TYPES)[number];

export const PAYEE_TYPE_LABEL: Record<PayeeType, string> = {
  lab: "Lab ảnh",
  vendor: "Thợ ngoài",
  supplier: "NCC phôi",
  employee: "Ekip",
};

export interface PayableRow {
  payee_type: PayeeType;
  payee_id: string;
  payee_name: string;
  item_count: number;
  total_committed: number;
  total_paid: number;
  remaining: number;
  last_item_date: string | null;
  last_payment_date: string | null;
}

/** Một khoản còn phải trả của đối tác (đơn in / task / lô nhập) — payable_items() */
export interface PayableItem {
  target_type: string;
  target_id: string;
  item_date: string | null;
  label: string;
  committed: number;
  allocated: number;
  remaining: number;
}

export interface PayeePaymentAllocation {
  target_type: string;
  target_id: string;
  label: string;
  amount: number;
}

export interface PayeePaymentHistoryItem {
  id: string;
  expense_date: string;
  amount: number;
  payment_method: string;
  note: string | null;
  created_at: string | null;
  allocations: PayeePaymentAllocation[];
}

export interface RecordPayeePaymentInput {
  payee_type: PayeeType;
  payee_id: string;
  amount: number;
  payment_method: "tien_mat" | "chuyen_khoan";
  payment_date: string;
  note?: string;
  allocations?: Array<{ target_id: string; amount: number }>;
}
