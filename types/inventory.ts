/**
 * 📦 Inventory Module Types
 *
 * Types for consumable inventory items & transactions.
 * DB tables: inventory_items, inventory_transactions
 *
 * @see types/dress.ts for pattern reference
 * @see docs/specs/inventory.md for full spec
 */

import type { InventoryCategory, InventoryStatus, InventoryUnit } from "@/lib/validations/inventory.schema";

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
  status?: InventoryStatus | "all";
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
  totalValue: number;
  transactionsThisMonth: number;
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
  reason: string | null;
  supplier: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  performed_by: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  item_name?: string;
  item_code?: string;
  performer_name?: string;
}

// ─── INVENTORY DETAIL (with transactions) ────────────

export interface InventoryDetail extends InventoryItem {
  transactions: InventoryTransaction[];
}
