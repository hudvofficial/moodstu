import type { Role } from "@/types/roles";

export type MoodieIntentDomain =
  | "finance"
  | "contracts"
  | "crm_calendar_ops"
  | "catalog"
  | "codebase"
  | "general";

export type MoodieToolManifestEntry = {
  name: string;
  domains: MoodieIntentDomain[];
  requiresData: boolean;
  readOnly: boolean;
  adminOnly?: boolean;
  priority: number;
};

export const MOODIE_TOOL_MANIFEST: Record<string, MoodieToolManifestEntry> = {
  get_financial_summary: { name: "get_financial_summary", domains: ["finance"], requiresData: true, readOnly: true, priority: 100 },
  get_debt_summary: { name: "get_debt_summary", domains: ["finance"], requiresData: true, readOnly: true, priority: 95 },
  get_pending_collections: { name: "get_pending_collections", domains: ["finance", "contracts"], requiresData: true, readOnly: true, priority: 90 },
  search_contracts: { name: "search_contracts", domains: ["contracts", "crm_calendar_ops"], requiresData: true, readOnly: true, priority: 90 },
  get_calendar_agenda: { name: "get_calendar_agenda", domains: ["crm_calendar_ops", "contracts"], requiresData: true, readOnly: true, priority: 96 },
  get_upcoming_schedules: { name: "get_upcoming_schedules", domains: ["crm_calendar_ops", "contracts"], requiresData: true, readOnly: true, priority: 86 },
  get_contract_delivery_assets: { name: "get_contract_delivery_assets", domains: ["contracts"], requiresData: true, readOnly: true, priority: 94 },
  list_contract_gallery_images: { name: "list_contract_gallery_images", domains: ["contracts"], requiresData: true, readOnly: true, priority: 93 },
  get_team_summary: { name: "get_team_summary", domains: ["crm_calendar_ops"], requiresData: true, readOnly: true, priority: 78 },
  get_services_catalog: { name: "get_services_catalog", domains: ["catalog", "contracts"], requiresData: true, readOnly: true, priority: 80 },
  get_financial_goals: { name: "get_financial_goals", domains: ["finance"], requiresData: true, readOnly: true, priority: 82 },
  get_repo_map: { name: "get_repo_map", domains: ["codebase"], requiresData: true, readOnly: true, adminOnly: true, priority: 100 },
  read_file: { name: "read_file", domains: ["codebase"], requiresData: true, readOnly: true, adminOnly: true, priority: 95 },
  list_symbols: { name: "list_symbols", domains: ["codebase"], requiresData: true, readOnly: true, adminOnly: true, priority: 92 },
  grep_code: { name: "grep_code", domains: ["codebase"], requiresData: true, readOnly: true, adminOnly: true, priority: 90 },
  get_schema: { name: "get_schema", domains: ["codebase", "contracts", "finance"], requiresData: true, readOnly: true, adminOnly: true, priority: 75 },
};

export function getMoodieToolManifestEntry(name: string) {
  return MOODIE_TOOL_MANIFEST[name];
}

export function canExposeMoodieTool(name: string, role: Role) {
  const entry = getMoodieToolManifestEntry(name);
  if (!entry) return false;
  return !entry.adminOnly || role === "admin";
}
