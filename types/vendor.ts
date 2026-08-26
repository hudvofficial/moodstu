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

// Thanh toán / công nợ thợ ngoài: ADR-016 M2 hợp nhất về types/payables.ts (PayableRow, PayableItem…)
