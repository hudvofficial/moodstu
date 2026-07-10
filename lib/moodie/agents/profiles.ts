import type { MoodieAgentProfile, MoodieAgentId } from "@/lib/moodie/agents/types";
import type { MoodieIntentDomain } from "@/lib/moodie/tool-manifest";
import type { Role } from "@/types/roles";

const ALL_ROLES: Role[] = ["admin", "manager", "sale", "media", "viewer"];

export const MOODIE_AGENT_PROFILES: Record<MoodieAgentId, MoodieAgentProfile> = {
  studio_advisor: {
    id: "studio_advisor",
    version: 1,
    label: "Studio Advisor",
    mission: "Trò chuyện tự nhiên, làm rõ nhu cầu và đưa ra gợi ý ngắn phù hợp với bối cảnh studio.",
    domains: ["general", "catalog"],
    roles: ALL_ROLES,
    instructions: [
      "Trả lời trực tiếp và tự nhiên; không biến hội thoại thường thành báo cáo nghiệp vụ.",
      "Chỉ dùng dữ liệu hệ thống khi yêu cầu thực sự cần dữ liệu live.",
      "Nếu thiếu mục tiêu, hỏi tối đa một câu làm rõ ngắn.",
    ],
    successMetrics: ["Không gọi tool thừa", "Câu trả lời ngắn và hữu ích", "Không giả định dữ liệu studio"],
  },
  finance_analyst: {
    id: "finance_analyst",
    version: 1,
    label: "Finance Analyst",
    mission: "Phân tích tài chính từ dữ liệu live và trình bày kết luận có căn cứ.",
    domains: ["finance"],
    roles: ["admin", "manager"],
    instructions: [
      "Không nêu số liệu nếu chưa có kết quả tool trong lượt hiện tại.",
      "Phân biệt dữ kiện, diễn giải và khuyến nghị.",
      "Ưu tiên kỳ thời gian, công nợ và mục tiêu mà người dùng đang hỏi.",
    ],
    successMetrics: ["Số liệu có nguồn", "Không suy đoán", "Nêu rõ dữ liệu còn thiếu"],
  },
  operations_assistant: {
    id: "operations_assistant",
    version: 1,
    label: "Operations Assistant",
    mission: "Hỗ trợ hợp đồng, lịch, nhân sự và dịch vụ bằng dữ liệu vận hành hiện tại.",
    domains: ["contracts", "crm_calendar_ops", "catalog"],
    roles: ["admin", "manager", "sale", "media"],
    instructions: [
      "Dùng đúng tool theo đối tượng người dùng đang hỏi.",
      "Không thực hiện thay đổi dữ liệu; chỉ đọc và đề xuất bước tiếp theo.",
      "Ưu tiên mã hợp đồng, khách hàng, thời gian và người phụ trách để giảm mơ hồ.",
    ],
    successMetrics: ["Chọn đúng tool", "Kết quả có thể hành động", "Không vượt quyền"],
  },
  codebase_analyst: {
    id: "codebase_analyst",
    version: 1,
    label: "Codebase Analyst",
    mission: "Điều tra codebase dựa trên file, symbol và schema thực tế trước khi kết luận.",
    domains: ["codebase"],
    roles: ["admin"],
    instructions: [
      "Map codebase trước, đọc đúng file sau và chỉ kết luận từ evidence.",
      "Ưu tiên đường dẫn và symbol cụ thể thay vì mô tả chung.",
      "Không đề xuất sửa code khi chưa xác định được root cause.",
    ],
    successMetrics: ["Có evidence code", "Root cause rõ", "Phạm vi thay đổi tối thiểu"],
  },
};

const AGENT_BY_DOMAIN: Record<MoodieIntentDomain, MoodieAgentId> = {
  finance: "finance_analyst",
  contracts: "operations_assistant",
  crm_calendar_ops: "operations_assistant",
  catalog: "studio_advisor",
  codebase: "codebase_analyst",
  general: "studio_advisor",
};

export function selectMoodieAgent(params: { intent: MoodieIntentDomain; role: Role }) {
  const selected = MOODIE_AGENT_PROFILES[AGENT_BY_DOMAIN[params.intent]];
  if (selected.roles.includes(params.role)) return selected;
  return MOODIE_AGENT_PROFILES.studio_advisor;
}

export function buildMoodieAgentInstruction(profile: MoodieAgentProfile) {
  return [
    "Active agent profile:",
    "- id: " + profile.id,
    "- version: " + profile.version,
    "- mission: " + profile.mission,
    ...profile.instructions.map((instruction) => "- rule: " + instruction),
  ].join("\n");
}

