import {
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  FileSearch,
  Images,
  PiggyBank,
  Package,
  type LucideIcon,
  Users,
} from "lucide-react";
import type { MoodieSkillId } from "@/types/moodie";

export const MOODIE_SKILL_HINT_MAP: Record<MoodieSkillId, string> = {
  financial_summary: "Tài chính",
  debt_summary: "Công nợ",
  pending_collections: "Thu nợ",
  contract_lookup: "Hợp đồng",
  schedule_summary: "Lịch",
  gallery_delivery: "Tiến độ gallery",
  gallery_images: "Ảnh gallery",
  team_summary: "Nhân sự",
  goal_summary: "Mục tiêu",
  service_catalog: "Dịch vụ",
  fallback: "Moodie",
};

export const MOODIE_SKILL_ICON_MAP: Record<MoodieSkillId, LucideIcon> = {
  financial_summary: CreditCard,
  debt_summary: CreditCard,
  pending_collections: BriefcaseBusiness,
  contract_lookup: FileSearch,
  schedule_summary: CalendarDays,
  gallery_delivery: Images,
  gallery_images: Images,
  team_summary: Users,
  goal_summary: PiggyBank,
  service_catalog: Package,
  fallback: BriefcaseBusiness,
};
