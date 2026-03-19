/**
 * 📦 CRM Module Types — V2
 * ENUM-based status, pipeline config, color maps
 */

// ─── LEAD STATUS ENUM (matches DB lead_status_enum) ──────
export type LeadStatus = "moi" | "da_lien_he" | "hen_gap" | "da_bao_gia" | "da_chot" | "huy";

// ─── LEAD POTENTIAL ENUM (matches DB lead_potential_enum) ──
export type LeadPotential = "hot" | "warm" | "cold";

// ─── SOURCE ──────────────────────────────────────────────
export type LeadSource = "facebook" | "zalo" | "walk_in" | "referral" | "website" | "tiktok";

// ─── PIPELINE COLOR MAP ─────────────────────────────────
export const LEAD_STATUS_MAP: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  moi:        { label: "Mới",         color: "#3B82F6", bg: "#EFF6FF" },
  da_lien_he: { label: "Đã liên hệ", color: "#F59E0B", bg: "#FFFBEB" },
  hen_gap:    { label: "Hẹn gặp",    color: "#F97316", bg: "#FFF7ED" },
  da_bao_gia: { label: "Đã báo giá", color: "#8B5CF6", bg: "#F5F3FF" },
  da_chot:    { label: "Đã chốt",    color: "#22C55E", bg: "#F0FDF4" },
  huy:        { label: "Huỷ",        color: "#EF4444", bg: "#FEF2F2" },
};

// ─── PIPELINE STAGES (ordered for Kanban) ────────────────
export const PIPELINE_STAGES: LeadStatus[] = [
  "moi", "da_lien_he", "hen_gap", "da_bao_gia", "da_chot"
];

// ─── SOURCE COLOR MAP ────────────────────────────────────
export const SOURCE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  facebook: { label: "Facebook", color: "#1877F2", bg: "#EBF3FE" },
  zalo:     { label: "Zalo",     color: "#0068FF", bg: "#E6F0FF" },
  walk_in:  { label: "Walk-in",  color: "#8B5E3C", bg: "#FAF7F2" },
  referral: { label: "Giới thiệu", color: "#C9A96E", bg: "#FBF8F1" },
  website:  { label: "Website",  color: "#6B7280", bg: "#F3F4F6" },
  tiktok:   { label: "TikTok",   color: "#FF0050", bg: "#FFF0F3" },
};

// ─── POTENTIAL COLOR MAP ─────────────────────────────────
export const POTENTIAL_MAP: Record<LeadPotential, { label: string; color: string; bg: string }> = {
  hot:  { label: "Nóng",  color: "#EF4444", bg: "#FEF2F2" },
  warm: { label: "Ấm",    color: "#F97316", bg: "#FFF7ED" },
  cold: { label: "Lạnh",  color: "#6B7280", bg: "#F3F4F6" },
};

// ─── CUSTOMER DATA MODEL ─────────────────────────────────
export interface Customer {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  address: string | null;
  gender: string | null;
  date_of_birth: string | null;
  wedding_date: string | null;
  bride_name: string | null;
  groom_name: string | null;
  avatar_url: string | null;
  source: string | null;
  notes: string | null;
  tags: string[] | null;
  status: string;
  lead_id: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

// ─── LEAD DATA MODEL ─────────────────────────────────────
export interface CrmLead {
  id: string;
  contact_date: string | null;
  contact_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  needs: string | null;
  address: string | null;
  potential: LeadPotential | null;
  status: LeadStatus;
  notes: string | null;
  care_history: CareLogEntry[] | string | null;
  care_type: string | null;
  social_link: string | null;
  next_contact_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  // V2 fields (ported from V1)
  deal_value: number;
  tags: string[];
  score: number;
  pipeline_order: number;
  status_changed_at: string | null;
  lost_reason: string | null;
  // Joined
  employees?: { id: string; full_name: string } | null;
}

// ─── CARE LOG ENTRY ──────────────────────────────────────
export interface CareLogEntry {
  id: string;
  date: string;
  content: string;
  type: string;
}

// ─── FORM DATA ────────────────────────────────────────────
export interface CustomerFormData {
  full_name: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  address?: string;
  gender?: string;
  date_of_birth?: string;
  wedding_date?: string;
  bride_name?: string;
  groom_name?: string;
  source?: string;
  notes?: string;
  tags?: string[];
}

export interface LeadFormData {
  contact_name: string;
  phone: string;
  email?: string;
  source?: string;
  needs?: string;
  address?: string;
  potential?: LeadPotential;
  status?: LeadStatus;
  notes?: string;
  social_link?: string;
  next_contact_date?: string;
  assigned_to?: string;
  contact_date?: string;
  deal_value?: number;
  tags?: string[];
  score?: number;
}

// ─── STATS ────────────────────────────────────────────────
export interface CustomerStats {
  total: number;
  newThisMonth: number;
  avgLifetimeValue: number;
}

export interface LeadStats {
  total: number;
  active: number;
  closed: number;
  conversionRate: number;
  byStatus: Record<string, number>;
}

// ─── TAG PRESETS (with colors for badge display) ─────────
export const TAG_PRESETS = [
  { label: "VIP", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { label: "Urgent", color: "bg-red-100 text-red-700 border-red-200" },
  { label: "Referral", color: "bg-green-100 text-green-700 border-green-200" },
  { label: "Wedding", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { label: "Baby", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { label: "Corporate", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { label: "Follow-up", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { label: "Hot Lead", color: "bg-rose-100 text-rose-700 border-rose-200" },
] as const;

export type TagLabel = typeof TAG_PRESETS[number]["label"];

// ─── SCORE LEVELS (ported from V1, icons → Lucide names) ─
export function getScoreLevel(score: number): { label: string; color: string; icon: string } {
  if (score >= 80) return { label: "Hot", color: "text-red-600 bg-red-50", icon: "Flame" };
  if (score >= 50) return { label: "Warm", color: "text-orange-600 bg-orange-50", icon: "Thermometer" };
  if (score >= 25) return { label: "Cool", color: "text-blue-600 bg-blue-50", icon: "Snowflake" };
  return { label: "Cold", color: "text-slate-500 bg-slate-50", icon: "ThermometerSnowflake" };
}

// ─── STATUS BADGE COLORS (V2 enum keys) ──────────────────
export const STATUS_BADGE_COLORS: Record<string, string> = {
  moi: "bg-slate-50 text-slate-600",
  da_lien_he: "bg-blue-50 text-blue-600",
  hen_gap: "bg-purple-50 text-purple-600",
  da_bao_gia: "bg-indigo-50 text-indigo-600",
  da_chot: "bg-green-50 text-green-600",
  huy: "bg-red-50 text-red-500",
};

export const POTENTIAL_BADGE_COLORS: Record<string, string> = {
  hot: "bg-red-50 text-red-600",
  warm: "bg-orange-50 text-orange-600",
  cold: "bg-slate-50 text-slate-500",
};

// ─── STATUS BAR COLORS (charts/funnel) ───────────────────
export const STATUS_BAR_COLORS: Record<string, string> = {
  moi: "bg-slate-400",
  da_lien_he: "bg-blue-500",
  hen_gap: "bg-purple-500",
  da_bao_gia: "bg-indigo-500",
  da_chot: "bg-emerald-500",
  huy: "bg-red-400",
};

// ─── AVATAR COLORS ───────────────────────────────────────
export const AVATAR_COLORS = [
  "bg-pink-100 text-pink-600",
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-orange-100 text-orange-600",
  "bg-teal-100 text-teal-600",
  "bg-indigo-100 text-indigo-600",
];

// ─── PIPELINE STATS ──────────────────────────────────────
export interface PipelineStageStats {
  status: string;
  lead_count: number;
  total_value: number;
  avg_score: number;
  avg_days_in_stage: number;
}

export interface ConversionFunnelEntry {
  status: string;
  lead_count: number;
  percentage: number;
}
