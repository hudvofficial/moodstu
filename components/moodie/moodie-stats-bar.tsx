import { Bot, LockKeyhole, MessagesSquare, Sparkles } from "lucide-react";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import type { MoodiePageStats } from "@/types/moodie";

interface MoodieStatsBarProps {
  stats: MoodiePageStats;
}

export function MoodieStatsBar({ stats }: MoodieStatsBarProps) {
  const items: StatItem[] = [
    {
      icon: MessagesSquare,
      label: "Hội thoại",
      value: String(stats.totalConversations),
      tone: "primary",
    },
    {
      icon: Bot,
      label: "Tin nhắn",
      value: String(stats.totalMessages),
      tone: "info",
    },
    {
      icon: Sparkles,
      label: "Business skills",
      value: String(stats.skillCount),
      tone: "accent",
    },
    {
      icon: LockKeyhole,
      label: "Đang xử lý",
      value: String(stats.lockedConversations),
      tone: "neutral",
    },
  ];

  return <StatsBar items={items} />;
}
