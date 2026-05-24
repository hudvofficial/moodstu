export interface Vendor {
  id: string;
  full_name: string;
  phone: string | null;
  service_type: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type VendorListItem = Pick<Vendor, 'id' | 'full_name' | 'phone' | 'service_type' | 'status'>;

// ═══════════════════════════════════════════
// Vendor Payment Types
// ═══════════════════════════════════════════

export interface VendorPayment {
  id: string;
  vendor_id: string;
  amount: number;
  payment_method: 'tien_mat' | 'chuyen_khoan' | 'the' | 'khac';
  payment_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

export interface VendorPaymentAllocation {
  id: string;
  payment_id: string;
  work_task_id: string;
  amount: number;
  created_at: string;
  created_by: string | null;
}

export interface VendorDebtItem {
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string | null;
  service_type: string | null;
  task_count: number;
  total_cost: number;
  total_paid: number;
  remaining: number;
  last_task_date: string | null;
  last_payment_date: string | null;
}

export interface VendorUnpaidTask {
  id: string;
  contract_id: string;
  contract_code: string | null;
  work_type: string;
  deadline: string | null;
  cost: number;
  allocated: number;
  remaining: number;
}

export interface VendorPaymentInput {
  vendor_id: string;
  amount: number;
  payment_method: 'tien_mat' | 'chuyen_khoan' | 'the' | 'khac';
  payment_date: string;
  note?: string;
  allocations?: Array<{
    work_task_id: string;
    amount: number;
  }>;
}
