/**
 * 📝 Service Form Types
 *
 * Used by the create/edit form components.
 * Separated from DB types to keep concerns clean.
 */

import type { ContentSection } from "./service";

// ─── Form Data (create/edit) ─────────────────────

export interface ServiceFormData {
  name: string;
  service_code: string;
  service_type: string;
  category_id: string;
  selling_price: number;
  cost_price: number;
  unit: string;
  fulfillment_type: string;
  status: string;
  description: string; // JSON string of ContentSection[]
  image_url: string;
}

// ─── Bundle Item Input (manual mode) ─────────────

export interface BundleItemInput {
  child_service_id: string;
  child_service_name?: string; // For display only
  child_service_price?: number; // For display only
  quantity: number;
  adjustment_price: number;
}

// ─── Editable Section (content editor) ───────────

export interface EditableSection extends ContentSection {
  id: string; // Temp ID for React key
}
