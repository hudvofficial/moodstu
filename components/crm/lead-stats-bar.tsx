import { Users, UserCheck, Inbox } from "lucide-react";
import { StatsBar } from "@/components/ui/stats-bar";
import type { LeadStats } from "@/types/crm";

interface Props {
  stats: LeadStats;
}

export default function LeadStatsBar({ stats }: Props) {
  const items = [
    { 
      icon: Users, 
      label: "tổng leads", 
      value: String(stats.total), 
      iconBg: "bg-primary/10", 
      iconColor: "text-primary" 
    },
    { 
      icon: Inbox, 
      label: "mới", 
      value: String(stats.byStatus?.moi || 0), 
      iconBg: "bg-info/10", 
      iconColor: "text-info" 
    },
    { 
      icon: UserCheck, 
      label: "đã chốt", 
      value: String(stats.byStatus?.da_chot || 0), 
      iconBg: "bg-success/10", 
      iconColor: "text-success" 
    },
  ];

  return <StatsBar items={items} />;
}
