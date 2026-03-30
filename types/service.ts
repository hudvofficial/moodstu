/**
 * 📦 Service Module Types — V2 Gold Standard
 *
 * DB tables: services, service_categories, service_bundles
 *
 * @see Lesson #65: snake_case ENUM, không tiếng Việt
 * @see Lesson #72: FK *_by → auth.users(id)
 * @see Lesson #89-90: Group B VARCHAR + TS enum
 */

// ─── Service Record (DB row) ─────────────────────

export interface ServiceRecord {
  id: string;
  service_code: string;
  name: string;
  service_type: string; // Group B — validated via TS const
  category_id: string | null;
  selling_price: number;
  cost_price: number;
  description: string | null;
  image_url: string | null;
  status: string; // "active" | "inactive"
  unit: string; // Group B — dich_vu, san_pham, etc.
  fulfillment_type: string; // "single" | "bundle"
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  // JOIN fields (optional, from queries)
  category?: ServiceCategory | null;
}

// ─── Service Category (DB row) ───────────────────

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Service Bundle Item (DB row) ────────────────

export interface ServiceBundleItem {
  id: string;
  parent_service_id: string;
  child_service_id: string;
  quantity: number;
  adjustment_price: number;
  sort_order: number;
  created_at: string;
  // JOIN field
  child_service?: Pick<ServiceRecord, "id" | "name" | "selling_price" | "unit"> | null;
}

// ─── Parsed Content (from description JSON) ──────

export interface ContentSection {
  title: string;
  items: string[];
}

// ─── Filters & Stats ─────────────────────────────

export interface ServiceFilters {
  search?: string;
  category?: string;
  status?: string;
  fulfillment_type?: string;
  page?: number;
  limit?: number;
}

export interface ServiceStats {
  total: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
}

// ─── Studio Info (for Quote branding) ────────────

export interface StudioInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  tagline: string | null;
}

// ─── VISUAL BUILDER TYPES (Phase 2) ──────────────

export type RelationType = "REQUIRED" | "OPTIONAL" | "SUGGESTED";

export interface ServiceRelation {
  id: string;
  parent_service_id: string;
  child_service_id?: string | null;
  child_category_id?: string | null;
  relation_type: RelationType;
  min_quantity: number;
  max_quantity: number | null;
}

export interface PriceRule {
  id: string;
  name: string;
  description?: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  priority: number;
  is_active: boolean;
}

