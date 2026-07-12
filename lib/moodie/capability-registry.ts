import type { Role } from "@/types/roles";

export type MoodieIntentDomain =
  | "finance"
  | "contracts"
  | "crm_calendar_ops"
  | "catalog"
  | "codebase"
  | "general";

export type MoodieCapabilityBoundary = "internal" | "external" | "mixed";
export type MoodieCapabilitySideEffect = "none" | "reversible" | "consequential";
export type MoodieCapabilityExecutionMode = "foreground" | "background" | "delegated";
export type MoodieCapabilitySurface = "text" | "voice";

export type MoodieCapability = {
  name: string;
  label: string;
  surfaces: MoodieCapabilitySurface[];
  domains: MoodieIntentDomain[];
  minimumRoles: Role[];
  boundary: MoodieCapabilityBoundary;
  sideEffect: MoodieCapabilitySideEffect;
  confirmation: "never" | "explicit";
  executionMode: MoodieCapabilityExecutionMode;
  requiresData: boolean;
  readOnly: boolean;
  priority: number;
  expectsSources?: boolean;
  voiceDescription?: string;
};

const ALL_ROLES: Role[] = ["admin", "manager", "sale", "media", "viewer"];
const ADMIN_ONLY: Role[] = ["admin"];

function internal(name: string, label: string, domains: MoodieIntentDomain[], priority: number, minimumRoles = ALL_ROLES): MoodieCapability {
  return { name, label, surfaces: ["text"], domains, minimumRoles, boundary: "internal", sideEffect: "none", confirmation: "never", executionMode: "foreground", requiresData: true, readOnly: true, priority };
}

export const MOODIE_CAPABILITIES: Record<string, MoodieCapability> = {
  ask_moodie: {
    name: "ask_moodie", label: "Moodie", surfaces: ["voice"], domains: ["general", "finance", "contracts", "crm_calendar_ops", "catalog", "codebase"], minimumRoles: ALL_ROLES,
    boundary: "mixed", sideEffect: "none", confirmation: "never", executionMode: "delegated", requiresData: true, readOnly: true, priority: 120,
    voiceDescription: "Hỏi bộ não Moodie. Bắt buộc dùng cho dữ liệu và nghiệp vụ Studio; Moodie tự áp dụng quyền, công cụ, nguồn và chính sách freshness.",
  },
  propose_moodie_task: {
    name: "propose_moodie_task", label: "Tạo tác vụ Moodie", surfaces: ["voice"], domains: ["general"], minimumRoles: ALL_ROLES,
    boundary: "mixed", sideEffect: "reversible", confirmation: "never", executionMode: "background", requiresData: true, readOnly: false, priority: 115,
    voiceDescription: "Tạo research hoặc task nền bền vững. Chỉ thông báo đã bắt đầu; không được giả vờ đã có kết quả.",
  },
  submit_moodie_task: {
    name: "submit_moodie_task", label: "Xác nhận tác vụ Moodie", surfaces: ["voice"], domains: ["general"], minimumRoles: ALL_ROLES,
    boundary: "internal", sideEffect: "consequential", confirmation: "explicit", executionMode: "background", requiresData: true, readOnly: false, priority: 114,
    voiceDescription: "Xác nhận action đã được đề xuất. Chỉ gọi sau câu đồng ý trực tiếp, rõ ràng của người dùng.",
  },
  get_moodie_task_status: {
    name: "get_moodie_task_status", label: "Trạng thái tác vụ Moodie", surfaces: ["voice"], domains: ["general"], minimumRoles: ALL_ROLES,
    boundary: "internal", sideEffect: "none", confirmation: "never", executionMode: "foreground", requiresData: true, readOnly: true, priority: 113,
    voiceDescription: "Đọc trạng thái, progress và kết quả đã lưu của tác vụ nền. Không suy đoán kết quả trước khi completed.",
  },
  cancel_moodie_task: {
    name: "cancel_moodie_task", label: "Huỷ tác vụ Moodie", surfaces: ["voice"], domains: ["general"], minimumRoles: ALL_ROLES,
    boundary: "internal", sideEffect: "reversible", confirmation: "never", executionMode: "foreground", requiresData: true, readOnly: false, priority: 112,
    voiceDescription: "Huỷ một tác vụ Moodie chưa kết thúc.",
  },
  start_deep_research: { name: "start_deep_research", label: "Deep Research", surfaces: ["text"], domains: ["general"], minimumRoles: ALL_ROLES, boundary: "external", sideEffect: "none", confirmation: "never", executionMode: "background", requiresData: true, readOnly: true, priority: 115, expectsSources: true },
  search_web: { name: "search_web", label: "Brave Web Search", surfaces: ["text"], domains: ["general"], minimumRoles: ALL_ROLES, boundary: "external", sideEffect: "none", confirmation: "never", executionMode: "foreground", requiresData: true, readOnly: true, priority: 110, expectsSources: true },
  search_news: { name: "search_news", label: "Brave News Search", surfaces: ["text"], domains: ["general"], minimumRoles: ALL_ROLES, boundary: "external", sideEffect: "none", confirmation: "never", executionMode: "foreground", requiresData: true, readOnly: true, priority: 112, expectsSources: true },
  search_local: { name: "search_local", label: "Brave Local Search", surfaces: ["text"], domains: ["general"], minimumRoles: ALL_ROLES, boundary: "external", sideEffect: "none", confirmation: "never", executionMode: "foreground", requiresData: true, readOnly: true, priority: 111, expectsSources: true },
  get_financial_summary: internal("get_financial_summary", "Tổng quan tài chính", ["finance"], 100),
  get_debt_summary: internal("get_debt_summary", "Tổng quan công nợ", ["finance"], 95),
  get_pending_collections: internal("get_pending_collections", "Khoản cần thu", ["finance", "contracts"], 90),
  search_contracts: internal("search_contracts", "Tìm hợp đồng", ["contracts", "crm_calendar_ops"], 90),
  get_calendar_agenda: internal("get_calendar_agenda", "Lịch làm việc", ["crm_calendar_ops", "contracts"], 96),
  get_upcoming_schedules: internal("get_upcoming_schedules", "Lịch sắp tới", ["crm_calendar_ops", "contracts"], 86),
  get_contract_delivery_assets: internal("get_contract_delivery_assets", "Tài nguyên bàn giao", ["contracts"], 94),
  list_contract_gallery_images: internal("list_contract_gallery_images", "Ảnh gallery hợp đồng", ["contracts"], 93),
  get_team_summary: internal("get_team_summary", "Tổng quan đội ngũ", ["crm_calendar_ops"], 78),
  get_overdue_tasks: internal("get_overdue_tasks", "Công việc quá hạn", ["crm_calendar_ops"], 92),
  get_services_catalog: internal("get_services_catalog", "Danh mục dịch vụ", ["catalog", "contracts"], 80),
  get_financial_goals: internal("get_financial_goals", "Mục tiêu tài chính", ["finance"], 82),
  get_repo_map: internal("get_repo_map", "Sơ đồ codebase", ["codebase"], 100, ADMIN_ONLY),
  read_file: internal("read_file", "Đọc file", ["codebase"], 95, ADMIN_ONLY),
  list_symbols: internal("list_symbols", "Danh sách symbol", ["codebase"], 92, ADMIN_ONLY),
  grep_code: internal("grep_code", "Tìm trong code", ["codebase"], 90, ADMIN_ONLY),
  get_schema: internal("get_schema", "Schema hệ thống", ["codebase", "contracts", "finance"], 75, ADMIN_ONLY),
};

export function getMoodieCapability(name: string) {
  return MOODIE_CAPABILITIES[name];
}

export function canUseMoodieCapability(name: string, role: Role, surface?: MoodieCapabilitySurface) {
  const capability = getMoodieCapability(name);
  return Boolean(capability && capability.minimumRoles.includes(role) && (!surface || capability.surfaces.includes(surface)));
}

export function listMoodieCapabilities(surface: MoodieCapabilitySurface, role: Role) {
  return Object.values(MOODIE_CAPABILITIES)
    .filter((capability) => capability.surfaces.includes(surface) && capability.minimumRoles.includes(role))
    .sort((left, right) => right.priority - left.priority);
}
