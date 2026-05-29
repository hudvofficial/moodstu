import {
  BarChart3,
  Bot,
  Banknote,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  Package,
  Printer,
  Settings,
  Shirt,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type MenuGroup = "daily" | "management" | "assets" | "system";

export const GROUP_LABELS: Record<MenuGroup, string> = {
  daily: "Hằng ngày",
  management: "Quản lý",
  assets: "Tài sản",
  system: "",
};

export interface ModuleConfig {
  id: string;
  label: string;
  shortLabel?: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: MenuGroup;
  matchPrefix?: string;
}

export const MODULES: ModuleConfig[] = [
  {
    id: "contracts",
    label: "Hợp đồng",
    shortLabel: "Hợp đồng",
    description: "Quản lý hợp đồng và tiến độ dịch vụ",
    href: "/contracts",
    icon: FileText,
    group: "daily",
  },
  {
    id: "calendar",
    label: "Lịch làm việc",
    shortLabel: "Lịch",
    description: "Lịch chụp hình, sự kiện và phân công",
    href: "/calendar",
    icon: Calendar,
    group: "daily",
  },
  {
    id: "crm",
    label: "Hệ thống CRM",
    shortLabel: "CRM",
    description: "Quản lý phễu sale và chăm sóc khách hàng",
    href: "/crm/leads",
    icon: Users,
    group: "daily",
    matchPrefix: "/crm",
  },
  {
    id: "finance",
    label: "Tài chính",
    description: "Thu chi, công nợ và báo cáo tài chính",
    href: "/finance",
    icon: Wallet,
    group: "management",
  },
  {
    id: "printing",
    label: "Xưởng in (Labs)",
    description: "Quản lý đơn in ảnh và album",
    href: "/printing",
    icon: Printer,
    group: "management",
  },
  {
    id: "reports",
    label: "Báo cáo",
    description: "Thống kê và phân tích dữ liệu kinh doanh",
    href: "/reports",
    icon: BarChart3,
    group: "management",
  },
  {
    id: "productivity",
    label: "Năng suất ekip",
    description: "Theo dõi hiệu suất đội ngũ",
    href: "/productivity",
    icon: TrendingUp,
    group: "management",
  },
  {
    id: "services",
    label: "Dịch vụ",
    description: "Quản lý gói dịch vụ và bảng giá",
    href: "/services",
    icon: ClipboardList,
    group: "assets",
  },
  {
    id: "inventory",
    label: "Vật tư",
    description: "Quản lý vật tư và tồn kho",
    href: "/inventory",
    icon: Package,
    group: "assets",
  },
  {
    id: "dresses",
    label: "Váy cưới",
    description: "Quản lý trang phục và tình trạng cho thuê",
    href: "/dresses",
    icon: Shirt,
    group: "assets",
  },
  {
    id: "employees",
    label: "Nhân viên",
    description: "Quản lý nhân viên, lương và chấm công",
    href: "/employees",
    icon: Briefcase,
    group: "system",
  },
  {
    id: "settings",
    label: "Cài đặt",
    shortLabel: "Cài đặt",
    description: "Cấu hình hệ thống và tài khoản",
    href: "/settings",
    icon: Settings,
    group: "system",
  },
  {
    id: "moodie",
    label: "Trợ lý AI (Moodie)",
    shortLabel: "Moodie",
    description: "Trợ lý AI thông minh",
    href: "/moodie",
    icon: Bot,
    group: "system",
  },
  {
    id: "salaries",
    label: "Bảng lương",
    shortLabel: "Bảng lương",
    description: "Quản lý lương và hoa hồng",
    href: "/finance/salaries",
    icon: Banknote,
    group: "system",
  },
  {
    id: "goals",
    label: "Mục tiêu",
    shortLabel: "Mục tiêu",
    description: "Mục tiêu doanh thu và KPI",
    href: "/finance/goals",
    icon: Target,
    group: "system",
  },
];

export const MODULE_MAP = Object.fromEntries(
  MODULES.map((moduleConfig) => [moduleConfig.id, moduleConfig]),
) as Record<string, ModuleConfig>;

export const DEFAULT_MODULE: ModuleConfig = {
  id: "dashboard",
  label: "Trung tâm điều hành",
  shortLabel: "Dashboard",
  description: "Tổng quan hoạt động kinh doanh",
  href: "/dashboard",
  icon: FileText,
  group: "daily",
};

const SLUG_ALIAS: Record<string, string> = {
  "audit-logs": "settings",
};

export function getModuleFromPath(pathname: string): ModuleConfig {
  const slug = pathname.split("/")[1] || "dashboard";
  const resolvedSlug = SLUG_ALIAS[slug] || slug;
  return MODULE_MAP[resolvedSlug] || DEFAULT_MODULE;
}

export function getMenuGroups(): MenuGroup[] {
  const seen = new Set<MenuGroup>();
  const groups: MenuGroup[] = [];
  for (const moduleConfig of MODULES) {
    if (!seen.has(moduleConfig.group)) {
      seen.add(moduleConfig.group);
      groups.push(moduleConfig.group);
    }
  }
  return groups;
}
