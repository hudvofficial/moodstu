export type MoodieRegressionCase = {
  id: string;
  prompt: string;
  expectedIntent: string;
  expectsToolUse: boolean;
  expectedSignals: string[];
  expectedAgentId?: string;
  expectedSkillId?: string;
  expectedPartTypes?: string[];
  requiresEvidenceComplete?: boolean;
};

export const MOODIE_REGRESSION_SUITE: MoodieRegressionCase[] = [
  {
    id: "identity_moodie",
    prompt: "Bạn là ai?",
    expectedIntent: "general",
    expectsToolUse: false,
    expectedSignals: ["direct_answer", "identity_moodie"],
    expectedAgentId: "studio_advisor",
  },
  {
    id: "studio_daily_brief",
    prompt: "Tình hình studio hiện tại thế nào?",
    expectedIntent: "crm_calendar_ops",
    expectsToolUse: true,
    expectedSignals: ["get_team_summary"],
    expectedAgentId: "operations_assistant",
    expectedSkillId: "studio_daily_brief",
    expectedPartTypes: ["metric_grid"],
    requiresEvidenceComplete: true,
  },
  {
    id: "finance_monthly_summary",
    prompt: "Tai chinh tong quan thang nay ra sao, co rui ro dong tien nao khong?",
    expectedIntent: "finance",
    expectsToolUse: true,
    expectedSignals: ["get_financial_summary", "retrieval", "no_hallucination"],
    expectedAgentId: "finance_analyst",
  },
  {
    id: "contract_lookup_customer",
    prompt: "Hop dong cua khach Linh con no bao nhieu va lich chup sap toi khi nao?",
    expectedIntent: "contracts",
    expectsToolUse: true,
    expectedSignals: ["search_contracts", "get_upcoming_schedules"],
    expectedAgentId: "operations_assistant",
  },
  {
    id: "ops_team_schedule",
    prompt: "Hom nay ekip nao dang kin lich va ai co nguy co tre deadline?",
    expectedIntent: "crm_calendar_ops",
    expectsToolUse: true,
    expectedSignals: ["get_upcoming_schedules", "get_team_summary"],
    expectedAgentId: "operations_assistant",
  },
  {
    id: "catalog_services",
    prompt: "Bang gia goi chup baby hien co nhung gi?",
    expectedIntent: "catalog",
    expectsToolUse: true,
    expectedSignals: ["get_services_catalog"],
    expectedAgentId: "studio_advisor",
  },
  {
    id: "codebase_trace_logic",
    prompt: "Trace logic luu message Moodie chay qua file nao?",
    expectedIntent: "codebase",
    expectsToolUse: true,
    expectedSignals: ["get_repo_map", "read_file", "retrieval"],
    expectedAgentId: "codebase_analyst",
  },
  {
    id: "current_external_news",
    prompt: "Tin OpenAI mới nhất hôm nay là gì?",
    expectedIntent: "general",
    expectsToolUse: true,
    expectedSignals: ["search_news", "external_sources", "inline_citation"],
    expectedAgentId: "studio_advisor",
    requiresEvidenceComplete: true,
  },
  {
    id: "stable_general_no_search",
    prompt: "Giải thích nguyên tắc Pareto là gì?",
    expectedIntent: "general",
    expectsToolUse: false,
    expectedSignals: ["direct_answer", "no_paid_search"],
    expectedAgentId: "studio_advisor",
  },
  {
    id: "deep_external_research",
    prompt: "Nghiên cứu sâu xu hướng trợ lý AI mới nhất và lập báo cáo chi tiết từ nhiều nguồn.",
    expectedIntent: "general",
    expectsToolUse: true,
    expectedSignals: ["start_deep_research", "background_run"],
    expectedAgentId: "studio_advisor",
    requiresEvidenceComplete: true,
  },
  {
    id: "general_clarify",
    prompt: "Moodie co giup duoc gi cho studio?",
    expectedIntent: "general",
    expectsToolUse: false,
    expectedSignals: ["direct_answer"],
    expectedAgentId: "studio_advisor",
  },
  {
    id: "calendar_tomorrow_unified",
    prompt: "Ngày mai studio có lịch gì?",
    expectedIntent: "crm_calendar_ops",
    expectsToolUse: true,
    expectedSignals: ["get_calendar_agenda", "timeline"],
    expectedAgentId: "operations_assistant",
  },
  {
    id: "calendar_google_week",
    prompt: "Tuần này lịch nào lấy từ Google Calendar?",
    expectedIntent: "crm_calendar_ops",
    expectsToolUse: true,
    expectedSignals: ["get_calendar_agenda", "google"],
    expectedAgentId: "operations_assistant",
  },
  {
    id: "gallery_contract_summary",
    prompt: "Hợp đồng HD-2026-0030 có bao nhiêu album ảnh?",
    expectedIntent: "contracts",
    expectsToolUse: true,
    expectedSignals: ["get_contract_delivery_assets", "metric_grid"],
    expectedAgentId: "operations_assistant",
  },
  {
    id: "gallery_selected_images",
    prompt: "Cho tôi xem ảnh đã chọn của hợp đồng này.",
    expectedIntent: "contracts",
    expectsToolUse: true,
    expectedSignals: ["list_contract_gallery_images", "gallery"],
    expectedAgentId: "operations_assistant",
  },
  {
    id: "gallery_sync_approval",
    prompt: "Đồng bộ lại thư mục Drive của hợp đồng này.",
    expectedIntent: "contracts",
    expectsToolUse: true,
    expectedSignals: ["get_contract_delivery_assets", "approval"],
    expectedAgentId: "operations_assistant",
  },
  {
    id: "gallery_share_approval",
    prompt: "Tạo link trả ảnh cho khách.",
    expectedIntent: "contracts",
    expectsToolUse: true,
    expectedSignals: ["get_contract_delivery_assets", "approval"],
    expectedAgentId: "operations_assistant",
  },
];
