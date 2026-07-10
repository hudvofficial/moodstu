import { canAccess, type Role } from "@/types/roles";
import type { MoodieCapability, MoodieSkillId } from "@/types/moodie";

type MoodieCapabilityConfig = MoodieCapability & {
  requiredModule?: "finance" | "contracts" | "calendar" | "employees" | "services";
};

export const MOODIE_PROVIDER_LABEL = "Moodie Core";
export const MOODIE_LOCK_WINDOW_MS = 45_000;

export const MOODIE_CAPABILITY_CATALOG: MoodieCapabilityConfig[] = [
  {
    id: "financial_summary",
    label: "Tài chính tổng quan",
    description: "Tóm tắt doanh thu, chi phí, lợi nhuận theo tháng, quý hoặc năm.",
    prompts: ["Tóm tắt tài chính tháng này", "Lợi nhuận quý này thế nào?", "Doanh thu năm nay ra sao?"],
    requiredModule: "finance",
  },
  {
    id: "debt_summary",
    label: "Công nợ",
    description: "Phải thu, phải trả, nợ quá hạn và bucket tuổi nợ hiện tại.",
    prompts: ["Công nợ hiện tại thế nào?", "Khoản nào đang quá hạn?", "Phải thu và phải trả hôm nay là bao nhiêu?"],
    requiredModule: "finance",
  },
  {
    id: "pending_collections",
    label: "Danh sách cần thu",
    description: "Các hợp đồng còn tiền cần thu và giá trị còn lại.",
    prompts: ["Những hợp đồng nào còn phải thu?", "Top khoản cần thu hôm nay", "Danh sách cần thu tuần này"],
    requiredModule: "finance",
  },
  {
    id: "contract_lookup",
    label: "Tra cứu hợp đồng",
    description: "Tìm nhanh hợp đồng theo mã, tên khách hoặc trạng thái thanh toán.",
    prompts: ["Tìm hợp đồng HD026", "Hợp đồng của khách Lan", "Những hợp đồng còn chưa thanh toán"],
    requiredModule: "contracts",
  },
  {
    id: "schedule_summary",
    label: "Lịch sắp tới",
    description: "Sự kiện hôm nay, ngày mai hoặc lịch chạy trong tuần.",
    prompts: ["Lịch hôm nay có gì?", "Ngày mai ê-kíp có lịch nào?", "Lịch tuần này ra sao?"],
    requiredModule: "calendar",
  },
  {
    id: "team_summary",
    label: "Nhân sự & tiến độ",
    description: "Nhân sự đang hoạt động, số task trễ hạn và điểm nghẽn vận hành.",
    prompts: ["Nhân sự đang hoạt động thế nào?", "Có bao nhiêu công việc trễ hạn?", "Tiến độ ê-kíp hôm nay ra sao?"],
    requiredModule: "employees",
  },
  {
    id: "goal_summary",
    label: "Mục tiêu tài chính",
    description: "Tiến độ tiết kiệm, quỹ dự phòng và khả năng góp vốn trong kỳ hiện tại.",
    prompts: ["Tiến độ các mục tiêu tài chính thế nào?", "Tháng này còn dành được bao nhiêu cho mục tiêu?", "Quỹ dự phòng đang tới đâu?"],
    requiredModule: "finance",
  },
  {
    id: "service_catalog",
    label: "Dịch vụ & bảng giá",
    description: "Tra cứu các gói đang bán và mức giá đang áp dụng.",
    prompts: ["Bảng giá dịch vụ hiện tại", "Giá gói baby là bao nhiêu?", "Những dịch vụ đang active"],
    requiredModule: "services",
  },
];

export function getMoodieCapabilitiesForRole(role: Role): MoodieCapability[] {
  return MOODIE_CAPABILITY_CATALOG
    .filter((capability) => !capability.requiredModule || canAccess(role, capability.requiredModule))
    .map((capability) => ({
      id: capability.id,
      label: capability.label,
      description: capability.description,
      prompts: capability.prompts,
    }));
}

export function getMoodieDefaultSuggestions(role: Role): string[] {
  return getMoodieCapabilitiesForRole(role)
    .flatMap((capability) => capability.prompts)
    .slice(0, 6);
}

export function getMoodieCapabilityById(id: MoodieSkillId) {
  return MOODIE_CAPABILITY_CATALOG.find((capability) => capability.id === id) ?? null;
}
