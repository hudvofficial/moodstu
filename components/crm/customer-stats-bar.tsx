import { Banknote, UserPlus, Users } from "lucide-react";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import { formatVnd } from "@/lib/utils";
import type { CustomerStats } from "@/types/crm";

interface Props {
  stats: CustomerStats;
  compact?: boolean;
}

type CustomerStatId = "total" | "newThisMonth" | "avgLtv";

export default function CustomerStatsBar({ stats, compact }: Props) {
  const allItems: Array<StatItem & { id: CustomerStatId }> = [
    {
      id: "total",
      icon: Users,
      label: "Tổng KH",
      value: String(stats.total),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      id: "newThisMonth",
      icon: UserPlus,
      label: "Mới tháng",
      value: String(stats.newThisMonth),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      id: "avgLtv",
      icon: Banknote,
      label: "LTV TB",
      value: formatVnd(stats.avgLifetimeValue),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  const items = compact
    ? allItems.filter(
        (item) => item.id === "total" || item.id === "newThisMonth",
      )
    : allItems;

  return <StatsBar items={items} />;
}
