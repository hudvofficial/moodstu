import { canAccess, type Role } from "@/types/roles";
import type { MoodieActionPreview } from "@/types/moodie";

type NavigationRule = { keywords: string[]; href: string; label: string; module: string };

const NAVIGATION_RULES: NavigationRule[] = [
  { keywords: ["cong no", "khoan can thu"], href: "/finance/debts", label: "Mở trang công nợ", module: "finance" },
  { keywords: ["tai chinh", "dong tien"], href: "/finance/dashboard", label: "Mở tài chính", module: "finance" },
  { keywords: ["hop dong"], href: "/contracts", label: "Mở danh sách hợp đồng", module: "contracts" },
  { keywords: ["lich hen", "lich hom nay", "lich chup"], href: "/calendar", label: "Mở lịch", module: "calendar" },
  { keywords: ["dich vu", "bang gia"], href: "/services", label: "Mở dịch vụ", module: "services" },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function planMoodieSafeNavigation(params: { prompt: string; role: Role }): MoodieActionPreview | null {
  const prompt = normalizeText(params.prompt);
  const requestsNavigation = /\b(mo|den|di toi|chuyen toi|xem trang)\b/.test(prompt);
  if (!requestsNavigation) return null;

  const rule = NAVIGATION_RULES.find((candidate) => candidate.keywords.some((keyword) => prompt.includes(keyword)));
  if (!rule || !canAccess(params.role, rule.module)) return null;

  return {
    id: "navigate:" + rule.href,
    kind: "navigate",
    label: rule.label,
    href: rule.href,
    description: "Điều hướng trong ứng dụng, không thay đổi dữ liệu.",
    risk: "none",
    requires_approval: false,
  };
}

