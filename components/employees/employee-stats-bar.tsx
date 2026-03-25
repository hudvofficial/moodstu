import { Users, UserCheck, Building2 } from "lucide-react";
import { StatsBar } from "@/components/ui/stats-bar";

// ═══════════════════════════════════════════
// EmployeeStatsBar — Employee stats (uses shared StatsBar)
// Phase 5: refactored to shared StatsBar component
// Keeps: items logic, topDept calculation
// ═══════════════════════════════════════════

interface Props {
  stats: { total: number; active: number; departments: Record<string, number> };
}

export default function EmployeeStatsBar({ stats }: Props) {
  const deptEntries = Object.entries(stats.departments);
  const topDept = deptEntries.length > 0
    ? deptEntries.sort((a, b) => b[1] - a[1])[0]
    : null;

  const items = [
    { icon: Users, label: "tổng NV", value: String(stats.total), iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: UserCheck, label: "đang làm", value: String(stats.active), iconBg: "bg-success/10", iconColor: "text-success" },
    { icon: Building2, label: topDept ? topDept[0] : "phòng ban", value: String(topDept ? topDept[1] : 0), iconBg: "bg-info/10", iconColor: "text-info" },
  ];

  return <StatsBar items={items} />;
}
