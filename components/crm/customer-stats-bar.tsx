import { Users, UserPlus, Banknote } from "lucide-react";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import { formatCurrency } from "@/lib/utils";
import type { CustomerStats } from "@/types/crm";

interface Props {
  stats: CustomerStats;
  /** Mobile compact: only show 2 key metrics */
  compact?: boolean;
}

export default function CustomerStatsBar({ stats, compact }: Props) {
  const allItems: StatItem[] = [
    {
      icon: Users,
      label: "tổng KH",
      value: String(stats.total),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: UserPlus,
      label: "mới tháng",
      value: String(stats.newThisMonth),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: Banknote,
      label: "LTV TB",
      value: formatCurrency(stats.avgLifetimeValue),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  // Mobile compact: only show total + new this month (2 key metrics)
  const items = compact
    ? allItems.filter((i) => i.label === "tổng KH" || i.label === "mới tháng")
    : allItems;

  return <StatsBar items={items} />;
}
