import type {
  LabStatus,
  PrintingOrderStatus,
  PrintingPaymentStatus,
} from "@/types/printing-constants";

export interface PrintingItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PrintingFilters {
  status?: PrintingOrderStatus | "all";
  labId?: string | "all";
  paymentStatus?: PrintingPaymentStatus | "all";
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PrintingOrderRow {
  id: string;
  orderCode: string;
  contractId: string | null;
  contractCode: string;
  customerName: string;
  labId: string | null;
  labName: string | null;
  status: PrintingOrderStatus;
  paymentStatus: PrintingPaymentStatus;
  totalAmount: number;
  orderDate: string | null;
  expectedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  items: PrintingItem[];
  updatedAt: string | null;
  createdAt: string | null;
}

export interface PrintingOrderDetail extends PrintingOrderRow {
  deliveredDate: string | null;
  lab: {
    id: string;
    lab_name: string;
  } | null;
  contract: {
    id: string;
    contract_code: string;
    customer_name: string;
  };
}

export interface PrintingOrdersPage {
  orders: PrintingOrderRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PrintingStats {
  total: number;
  choXuLy: number;
  dangIn: number;
  daIn: number;
  hoanThanh: number;
  huyDon: number;
  totalCost: number;
  unpaidCost: number;
}

export interface ContractOption {
  id: string;
  contract_code: string;
  customer_name: string;
}

export interface LabOption {
  id: string;
  lab_name: string;
}

export interface LabService {
  id?: string;
  lab_id?: string;
  item_name: string;
  cost_price: number;
  /** SKU chung đã map (null = dịch vụ chưa map, giữ cost cũ) */
  product_id?: string | null;
  /** NULL = dùng giá bán mặc định của SKU. 0 là giá hợp lệ, KHÔNG phải "chưa set". */
  selling_price_override?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ─── LAB CATALOG PRICING (T-20261112) ───

export type PriceSource = "override" | "default" | "unmapped";

/** Catalog SKU in ảnh dùng chung toàn studio */
export interface PrintProduct {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  specification: string | null;
  unit: string | null;
  default_selling_price: number;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

/** Một dòng bảng giá Lab × SKU, đã quy về giá bán hiệu lực */
export interface LabProductPrice {
  labServiceId: string;
  labId: string;
  itemName: string;
  productId: string | null;
  sku: string | null;
  productName: string | null;
  costPrice: number;
  defaultSellingPrice: number | null;
  sellingPriceOverride: number | null;
  effectiveSellingPrice: number | null;
  priceSource: PriceSource;
  /** giá bán hiệu lực − cost. null khi chưa có giá bán. */
  margin: number | null;
  productActive: boolean | null;
  updatedAt: string | null;
}

export interface LabPayment {
  id: string;
  lab_id: string;
  amount: number;
  payment_method: string;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Lab {
  id: string;
  lab_name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  status: LabStatus;
  created_at: string | null;
  serviceCount: number;
  servicePreview?: string[];
  services: LabService[];
  outstandingDebt: number;
  unpaidOrders: number;
  lastPaymentAt: string | null;
}

export interface LabDetail extends Lab {
  payments: LabPayment[];
}

export interface LabDebtEntry {
  labId: string;
  labName: string;
  unpaidOrders: number;
  totalDebt: number;
  lastOrderDate: string | null;
}

export interface LabDebtData {
  totalDebt: number;
  totalLabs: number;
  totalOrders: number;
  items: LabDebtEntry[];
}

// ─── PHASE 1: Order Payments ───

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

// ─── LAB PAYMENT FLOW ───

// Lab unpaid order with allocation tracking
export interface LabUnpaidOrder {
  id: string;
  orderCode: string;
  contractCode: string;
  customerName: string;
  totalAmount: number;
  allocatedAmount: number;     // Already paid amount to lab
  remainingAmount: number;      // Still owed to lab
  orderDate: string | null; // printing_orders.order_date NULLABLE
  status: PrintingOrderStatus;
}

// Individual allocation within a payment
export interface LabPaymentAllocation {
  orderId: string;
  orderCode: string;
  amount: number;
}

// Lab payment history item with allocations
export interface LabPaymentHistoryItem {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note: string | null;
  allocations: LabPaymentAllocation[];
  createdBy: string | null;
  createdAt: string;
}

// Paginated result for payment history
export interface LabPaymentHistoryPage {
  items: LabPaymentHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

// Input type for recording lab payment
export interface RecordLabPaymentInput {
  lab_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  note?: string;
  allocations: Array<{
    printing_order_id: string;
    amount: number;
  }>;
}
