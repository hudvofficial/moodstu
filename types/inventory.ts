/**
 * 📦 Inventory Module Types
 *
 * Types for consumable inventory items & transactions.
 * DB tables: inventory_items, inventory_transactions
 *
 * @see types/dress.ts for pattern reference
 * @see docs/specs/inventory.md for full spec
 */

import type {
  InventoryCategory,
  InventoryFilterStatus,
  InventoryStatus,
} from "@/lib/validations/inventory.schema";

// ─── CORE DATA MODEL (inventory_items row) ───────────

export interface InventoryItem {
  id: string;
  item_code: string;
  name: string;
  category: string | null;
  unit: string | null;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  average_unit_price: number;
  sale_price: number;
  supplier: string | null;
  image_url: string | null;
  status: InventoryStatus | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── FILTER STATE (synced to URL params) ─────────────

export interface InventoryFilters {
  search?: string;
  category?: InventoryCategory | "all";
  status?: InventoryFilterStatus;
  sort?: "newest" | "name_asc" | "stock_asc" | "stock_desc";
  page?: number;
}

// ─── TRANSACTION HISTORY FILTERS ─────────────────────

export interface TransactionFilters {
  type?: "stock_in" | "stock_out" | "all";
  item_id?: string;
  contract_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
}

// ─── STATS FOR LIST HEADER ───────────────────────────

export interface InventoryStats {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  transactionsThisMonth: number;
}

export interface InventoryTransactionTotals {
  totalIn: number;
  totalOut: number;
  transactionCount: number;
}

// ─── TRANSACTION ROW ─────────────────────────────────

export interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  contract_id: string | null;
  contract_code?: string | null;
  reason: string | null;
  supplier: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  receipt_id?: string | null;
  sale_unit_price?: number | null;
  sale_total?: number | null;
  payment_method?: string | null;
  performed_by: string | null;
  created_by: string | null;
  notes: string | null;
  parent_transaction_id?: string | null;
  created_at: string;
  // Joined fields
  item_name?: string;
  item_code?: string;
  performer_name?: string;
}

// ─── INVENTORY DETAIL (with transactions) ────────────

export interface InventoryDetail extends InventoryItem {
  transactions: InventoryTransaction[];
  transactionTotals: InventoryTransactionTotals;
}

export interface InventoryPickerFilters {
  search?: string;
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export interface InventoryPickerPage {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface InventoryContractOption {
  id: string;
  contract_code: string;
  customer_name: string;
  customer_phone: string | null;
}
