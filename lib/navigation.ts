import {
  FileText,
  Users,
  Wallet,
  Package,
  Calendar,
  TrendingUp,
  BarChart3,
  Briefcase,
  Printer,
  Settings,
  ClipboardList,
  Shirt,
  Bot,
  type LucideIcon,
} from "lucide-react";

/**
 * SSOT — Module Registry
 * Tất cả module name, description, icon, href, group nằm ở 1 chỗ duy nhất.
 * Header, Sidebar, BottomNav đều import từ đây.
 *
 * NOTE: "dashboard" đã bỏ khỏi MODULES vì logo click = về /dashboard.
 * Tuy nhiên "dashboard" VẪN CÒN trong ROLE_PERMISSIONS (types/roles.ts).
 *
 * Menu items & grouping giống V1 để đồng bộ UX.
 */

export type MenuGroup = "daily" | "management" | "assets" | "system";

export const GROUP_LABELS: Record<MenuGroup, string> = {
  daily: "Hàng ngày",
  management: "Quản lý",
  assets: "Tài sản",
  system: "", // V1: no label, just divider
};

export interface ModuleConfig {
  id: string;
  /** Tên đầy đủ — hiển thị ở Header */
  label: string;
  /** Tên ngắn — hiển thị ở Sidebar & BottomNav (nếu khác label) */
  shortLabel?: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: MenuGroup;
  /** Optional route prefix used when href points to a default child route. */
  matchPrefix?: string;
}

export const MODULES: ModuleConfig[] = [
  // ── HÀNG NGÀY ──
  { id: "contracts", label: "Hợp đồng", shortLabel: "Hợp đồng", description: "Quản lý hợp đồng & tiến độ dịch vụ", href: "/contracts", icon: FileText, group: "daily" },
  { id: "calendar", label: "Lịch làm việc", shortLabel: "Lịch", description: "Lịch chụp hình, sự kiện & phân công", href: "/calendar", icon: Calendar, group: "daily" },
  { id: "crm", label: "Hệ thống CRM", shortLabel: "CRM", description: "Quản lý phễu Sale & Chăm sóc khách hàng", href: "/crm/leads", icon: Users, group: "daily", matchPrefix: "/crm" },

  // ── QUẢN LÝ ──
  { id: "finance", label: "Tài chính", description: "Thu chi, công nợ & báo cáo tài chính", href: "/finance", icon: Wallet, group: "management" },
  { id: "printing", label: "Xưởng in (Labs)", description: "Quản lý đơn in ảnh & album", href: "/printing", icon: Printer, group: "management" },
  { id: "reports", label: "Báo cáo", description: "Thống kê & phân tích dữ liệu kinh doanh", href: "/reports", icon: BarChart3, group: "management" },
  { id: "productivity", label: "Năng suất ekip", description: "Theo dõi hiệu suất đội ngũ", href: "/productivity", icon: TrendingUp, group: "management" },

  // ── TÀI SẢN ──
  { id: "services", label: "Dịch vụ", description: "Quản lý gói dịch vụ & bảng giá", href: "/services", icon: ClipboardList, group: "assets" },
  { id: "inventory", label: "Vật tư", description: "Quản lý vật tư & tồn kho", href: "/inventory", icon: Package, group: "assets" },
  { id: "dresses", label: "Váy cưới", description: "Quản lý trang phục & tình trạng cho thuê", href: "/dresses", icon: Shirt, group: "assets" },

  // ── HỆ THỐNG (no label, just divider) ──
  { id: "employees", label: "Nhân viên", description: "Quản lý nhân viên, lương & chấm công", href: "/employees", icon: Briefcase, group: "system" },
  { id: "settings", label: "Cài đặt", shortLabel: "Cài đặt", description: "Cấu hình hệ thống & tài khoản", href: "/settings", icon: Settings, group: "system" },
  { id: "moodie", label: "Trợ lý AI (Moodie)", shortLabel: "Moodie", description: "Trợ lý AI thông minh", href: "/moodie", icon: Bot, group: "system" },
];

/** Lookup nhanh theo slug (path segment đầu tiên) */
export const MODULE_MAP = Object.fromEntries(
  MODULES.map((m) => [m.id, m])
) as Record<string, ModuleConfig>;

/** Fallback khi không match slug nào */
export const DEFAULT_MODULE: ModuleConfig = {
  id: "dashboard",
  label: "Trung tâm điều hành",
  shortLabel: "Dashboard",
  description: "Tổng quan hoạt động kinh doanh",
  href: "/dashboard",
  icon: FileText,
  group: "daily",
};

/** Alias map: route slugs thuộc module khác (sub-page dùng route riêng) */
const SLUG_ALIAS: Record<string, string> = {
  "audit-logs": "settings",
};

/** Helper: lấy module từ pathname */
export function getModuleFromPath(pathname: string): ModuleConfig {
  const slug = pathname.split("/")[1] || "dashboard";
  const resolvedSlug = SLUG_ALIAS[slug] || slug;
  return MODULE_MAP[resolvedSlug] || DEFAULT_MODULE;
}

/** Helper: lấy ordered unique groups từ MODULES */
export function getMenuGroups(): MenuGroup[] {
  const seen = new Set<MenuGroup>();
  const groups: MenuGroup[] = [];
  for (const m of MODULES) {
    if (!seen.has(m.group)) {
      seen.add(m.group);
      groups.push(m.group);
    }
  }
  return groups;
}
