/**
 * 📦 Addon History Types (V2)
 *
 * Tracks previously used addons for autocomplete + price suggestions.
 * Table: addon_history (created in Phase 00 migration)
 */

// ─── ADDON CATEGORY (match DB addon_category_enum) ───────
export type AddonCategory =
  | "makeup"
  | "trang_phuc"
  | "phu_kien"
  | "them_gio"
  | "khac";

// ─── DATA MODEL ──────────────────────────────────────────

/** Addon history record from `addon_history` table */
export interface AddonHistory {
  id: string;
  addon_name: string;
  addon_category: AddonCategory | null;
  last_price: number;
  usage_count: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

/** Search result for addon autocomplete */
export interface AddonSuggestion {
  addon_name: string;
  addon_category: AddonCategory | null;
  last_price: number;
  usage_count: number;
}
