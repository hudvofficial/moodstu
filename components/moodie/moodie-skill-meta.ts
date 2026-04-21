import {
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  FileSearch,
  PiggyBank,
  Package,
  type LucideIcon,
  Users,
} from "lucide-react";
import type { MoodieSkillId } from "@/types/moodie";

export const MOODIE_SKILL_HINT_MAP: Record<MoodieSkillId, string> = {
  financial_summary: "Tai chinh",
  debt_summary: "Cong no",
  pending_collections: "Thu no",
  contract_lookup: "Hop dong",
  schedule_summary: "Lich",
  team_summary: "Nhan su",
  goal_summary: "Muc tieu",
  service_catalog: "Dich vu",
  fallback: "Moodie",
};

export const MOODIE_SKILL_ICON_MAP: Record<MoodieSkillId, LucideIcon> = {
  financial_summary: CreditCard,
  debt_summary: CreditCard,
  pending_collections: BriefcaseBusiness,
  contract_lookup: FileSearch,
  schedule_summary: CalendarDays,
  team_summary: Users,
  goal_summary: PiggyBank,
  service_catalog: Package,
  fallback: BriefcaseBusiness,
};
