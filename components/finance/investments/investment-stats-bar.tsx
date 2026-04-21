import { Landmark, BookOpen, Wrench } from "lucide-react";
import { StatsBar } from "@/components/ui/stats-bar";
import { formatCompactVnd } from "@/components/finance/finance-format";

// ═══════════════════════════════════════════
// InvestmentStatsBar — Compact stats (uses shared StatsBar)
// Clone: employee-stats-bar.tsx pattern
// ═══════════════════════════════════════════

interface Props {
    stats: { total: number; totalPurchase: number; totalBook: number; maintenanceDue: number };
}

export default function InvestmentStatsBar({ stats }: Props) {
    const items = [
        { icon: Landmark, label: "tài sản", value: String(stats.total), iconBg: "bg-primary/10", iconColor: "text-primary" },
        { icon: BookOpen, label: "giá trị sổ sách", value: formatCompactVnd(stats.totalBook), iconBg: "bg-success/10", iconColor: "text-success" },
        { icon: Wrench, label: "cần bảo trì", value: String(stats.maintenanceDue), iconBg: "bg-warning/10", iconColor: "text-warning" },
    ];
    return <StatsBar items={items} />;
}
