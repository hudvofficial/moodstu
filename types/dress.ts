/**
 * 📦 Dress Module Types (V2)
 *
 * Types for dress catalog, filters, stats.
 * DB table: dresses
 *
 * @see types/contract.ts for pattern reference
 */

import type { DressCategory, DressStatus } from "@/lib/validations/dress.schema";

// ─── CORE DATA MODEL (dresses row) ───────────────────

export interface DressItem {
  id: string;
  item_code: string;
  name: string;
  category: string | null;
  size: string | null;
  color: string | null;
  condition: string | null;
  rental_price: number | null;
  sale_price: number | null;
  purchase_price: number | null;
  current_stock: number | null;
  min_stock: number | null;
  image_url: string | null;
  status: DressStatus | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
}

// ─── FILTER STATE (synced to URL params via nuqs) ────────────

export interface DressFilters {
  search?: string;
  category?: DressCategory | "all";
  status?: DressStatus | "all";
  page?: number;
}

// ─── STATS FOR LIST HEADER ───────────────────────────────────

export interface DressStats {
  total: number;
  available: number;
  reserved: number;
  rented: number;
  maintenance: number;
}

// ─── DRESS DETAIL (with reservations) ────────────────────────

export interface DressReservation {
  id: string;
  contract_id: string;
  status: string | null;
  rental_price: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  contracts?: {
    id: string;
    contract_code: string;
    customers?: { full_name: string } | null;
  } | null;
}

export interface DressDetail extends DressItem {
  reservations: DressReservation[];
}

// ─── RENTAL HISTORY (full page) ──────────────────────────────

export interface RentalHistoryRow {
  id: string;
  inventory_item_id: string;
  contract_id: string;
  status: string | null;
  rental_price: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  contracts?: { id: string; contract_code: string; customers?: { full_name: string } | null } | null;
  dresses?: { id: string; name: string; item_code: string; category: string | null } | null;
}

export interface RentalHistoryFilters {
  item_id?: string;
  status?: "reserved" | "rented" | "returned" | "all";
  page?: number;
}

// ─── STANDALONE RENTAL (dress_rentals table) ─────────────────

export interface DressRental {
  id: string;
  item_id: string;
  contract_id: string | null;
  customer_name: string;
  phone: string | null;
  pickup_date: string;
  return_date: string;
  actual_return_date: string | null;
  rental_price: number;
  deposit: number;
  deposit_returned: boolean;
  damage_fee: number;
  status: string;
  accessories: string | null;
  notes: string | null;
  return_condition: string | null;
  created_at: string;
  // Joined fields
  item_name?: string;
  item_code?: string;
  item_image?: string;
}
