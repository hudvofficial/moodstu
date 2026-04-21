import { Inbox, UserCheck, Users } from "lucide-react";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import type { LeadStats } from "@/types/crm";

interface Props {
  stats: LeadStats;
}

export default function LeadStatsBar({ stats }: Props) {
  const items: StatItem[] = [
    {
      icon: Users,
      label: "Tổng leads",
      value: String(stats.total),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: Inbox,
      label: "Mới",
      value: String(stats.byStatus?.moi || 0),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
    {
      icon: UserCheck,
      label: "Đã chốt",
      value: String(stats.byStatus?.da_chot || 0),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
  ];

  return <StatsBar items={items} />;
}
