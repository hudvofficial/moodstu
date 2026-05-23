import type {
  LabStatus,
  PrintingOrderStatus,
  PrintingPaymentStatus,
} from "@/types/printing-constants";

export interface PrintingItem {
  item_id?: string;  // Optional link to inventory_items table for reservation
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
  // Phase 1: Enhanced payment & inventory tracking
  depositAmount?: number;
  finalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  inventoryStatus?: 'none' | 'reserved' | 'stocked_out' | 'cancelled';
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  deliveredAt?: string | null;
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
  datCoc: number;      // Phase 2: After deposit
  dangIn: number;
  daIn: number;
  daGiao: number;      // Phase 2: After delivery
  hoanThanh: number;   // Phase 2: Completed
  huyDon: number;      // Phase 2: Cancelled
  daNhan: number;      // Legacy
  daHuy: number;       // Legacy
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
  created_at?: string | null;
  updated_at?: string | null;
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

// ─── PHASE 1: Order Payments & Inventory Reservations ───

export type OrderPaymentType = 'deposit' | 'final' | 'refund' | 'adjustment';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';
export type ReservationStatus = 'active' | 'fulfilled' | 'cancelled' | 'expired';

export interface OrderPayment {
  id: string;
  order_id: string;
  payment_id: string | null;
  receipt_id: string | null;
  payment_type: OrderPaymentType;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface InventoryReservation {
  id: string;
  item_id: string;
  order_id: string;
  reserved_quantity: number;
  reserved_at: string;
  expires_at: string | null;
  status: ReservationStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  item_name?: string;
  item_code?: string;
  unit?: string;
}

export interface OrderPaymentSummary {
  order_id: string;
  total_amount: number;
  deposit_paid: number;
  final_paid: number;
  refund_amount: number;
  adjustment_amount: number;
  total_paid: number;
  remaining: number;
}

export interface InventoryAvailableStock {
  id: string;
  studio_id: string;
  item_code: string;
  name: string;
  current_stock: number;
  unit: string | null;
  reserved_quantity: number;
  available_stock: number;
  min_stock: number | null;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

// ─── PHASE 1: Action Inputs ───

export interface RecordDepositPaymentInput {
  orderId: string;
  depositAmount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  notes?: string;
}

export interface StartProductionInput {
  orderId: string;
  expiresInDays?: number; // Default 7 days
}

export interface CompleteProductionInput {
  orderId: string;
  manualStockOut?: boolean;
  adjustedItems?: Array<{
    item_id: string;
    quantity: number;
  }>;
}

export interface CancelOrderInput {
  orderId: string;
  reason: string;
  refundAmount?: number;
  refundMethod?: PaymentMethod;
}

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
  orderDate: string;
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
