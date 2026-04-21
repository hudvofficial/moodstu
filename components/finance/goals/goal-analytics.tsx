"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { Badge } from "@/components/ui/badge";
import type { GoalContributionItem } from "@/types/finance-operations";

function contributionDateKey(item: GoalContributionItem) {
  return item.contribution_date || item.created_at || null;
}

function parseTime(value: string) {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

export function GoalMilestoneBadges({ progress }: { progress: number }) {
  const milestones = [
    { pct: 25, label: "25%" },
    { pct: 50, label: "50%" },
    { pct: 75, label: "75%" },
    { pct: 100, label: "100%" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {milestones.map((m) => (
        <Badge key={m.pct} variant={progress >= m.pct ? "success" : "neutral"} className="text-caption">
          {m.label}
        </Badge>
      ))}
    </div>
  );
}

export function GoalSparkline({ contributions }: { contributions: GoalContributionItem[] }) {
  const points = useMemo(() => {
    const rows = contributions
      .map((c) => {
        const key = contributionDateKey(c);
        if (!key) return null;
        const time = parseTime(key);
        if (!time) return null;
        return { time, amount: c.amount || 0, date: key };
      })
      .filter((x): x is { time: number; amount: number; date: string } => Boolean(x))
      .sort((a, b) => a.time - b.time);

    if (rows.length === 0) return [];

    let acc = 0;
    return rows.map((row) => {
      acc += row.amount;
      return { time: row.time, value: acc, date: row.date };
    });
  }, [contributions]);

  if (points.length === 0) {
    return <p className="text-caption text-text-muted italic">Chưa có lần góp nào.</p>;
  }

  const maxVal = Math.max(...points.map((p) => p.value)) || 1;
  const w = 220;
  const h = 44;
  const padding = 6;

  const xStep = points.length > 1 ? (w - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padding + i * xStep,
    y: padding + (1 - p.value / maxVal) * (h - padding * 2),
  }));

  const pathD = coords.length <= 1 ? "" : coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaD = coords.length > 1 ? `${pathD} L ${coords[coords.length - 1].x} ${h - padding} L ${coords[0].x} ${h - padding} Z` : "";

  const total = points[points.length - 1]?.value || 0;
  const start = points[0]?.date ? points[0].date.slice(0, 10) : "";
  const end = points[points.length - 1]?.date ? points[points.length - 1].date.slice(0, 10) : "";

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-12"
        preserveAspectRatio="none"
        role="img"
        aria-label="Biểu đồ lịch sử góp"
      >
        {areaD ? <path d={areaD} fill="var(--color-interactive)" opacity={0.12} /> : null}
        {pathD ? <path d={pathD} fill="none" stroke="var(--color-interactive)" strokeWidth={2} strokeLinecap="round" /> : null}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.5} fill="var(--color-interactive)" />
        ))}
      </svg>

      <div className="flex items-center justify-between text-caption text-text-muted">
        <span>{start}{end && end !== start ? ` → ${end}` : ""}</span>
        <span className="font-semibold text-text-secondary">Tổng: {formatVnd(total)}</span>
      </div>
    </div>
  );
}

export function MonthlyContributionChart({ contributions }: { contributions: GoalContributionItem[] }) {
  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contributions) {
      const key = contributionDateKey(c);
      if (!key) continue;
      const d = new Date(key);
      if (Number.isNaN(d.getTime())) continue;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(monthKey, (map.get(monthKey) || 0) + (c.amount || 0));
    }
    const months = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return months.slice(-6);
  }, [contributions]);

  if (monthly.length === 0) {
    return <p className="text-caption text-text-muted italic text-center py-2">Chưa có dữ liệu góp tiền.</p>;
  }

  const maxVal = Math.max(...monthly.map((m) => m[1])) || 1;

  return (
    <div className="flex items-end gap-2 h-24">
      {monthly.map(([monthKey, value]) => {
        const height = (value / maxVal) * 100;
        const label = monthKey.split("-")[1] + "/" + monthKey.split("-")[0].slice(2);
        return (
          <div key={monthKey} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-micro font-semibold text-text-secondary tabular-nums">{formatVnd(value)}</span>
            <div className="w-full bg-bg-sidebar/50 rounded-t-sm relative" style={{ height: 64 }}>
              <div
                className="absolute bottom-0 w-full rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max(4, height)}%`, background: "var(--color-interactive)", opacity: 0.85 }}
              />
            </div>
            <span className="text-micro text-text-muted font-medium">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function GoalContributionInsights({
  contributions,
  monthlyNeeded,
}: {
  contributions: GoalContributionItem[];
  monthlyNeeded: number | null;
}) {
  const insights = useMemo(() => {
    if (contributions.length < 1 || !monthlyNeeded) return [];

    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    let thisTotal = 0;
    let lastTotal = 0;

    for (const c of contributions) {
      const key = contributionDateKey(c);
      if (!key) continue;
      const d = new Date(key);
      if (Number.isNaN(d.getTime())) continue;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthKey === thisMonthKey) thisTotal += c.amount || 0;
      if (monthKey === lastMonthKey) lastTotal += c.amount || 0;
    }

    const next: Array<
      { tone: "up" | "down" | "ok"; text: string }
    > = [];

    if (lastTotal > 0 && thisTotal > 0) {
      const change = ((thisTotal - lastTotal) / lastTotal) * 100;
      if (change > 10) {
        next.push({ tone: "up", text: `Tháng này góp nhiều hơn ${Math.round(change)}% so với tháng trước.` });
      } else if (change < -10) {
        next.push({ tone: "down", text: `Tháng này góp ít hơn ${Math.round(Math.abs(change))}% so với tháng trước.` });
      } else {
        next.push({ tone: "ok", text: "Mức góp ổn định so với tháng trước." });
      }
    }

    if (thisTotal >= monthlyNeeded) {
      next.push({ tone: "ok", text: "Đã đạt cam kết góp trong tháng này." });
    } else if (thisTotal > 0) {
      next.push({ tone: "down", text: `Cần góp thêm ${formatVnd(monthlyNeeded - thisTotal)} để đạt cam kết tháng.` });
    }

    return next;
  }, [contributions, monthlyNeeded]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <div key={insight.text} className="flex items-start gap-2 text-caption text-text-secondary">
          {insight.tone === "up" ? (
            <ArrowUpRight className="w-4 h-4 text-success shrink-0 mt-0.5" />
          ) : insight.tone === "down" ? (
            <ArrowDownRight className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-info shrink-0 mt-0.5" />
          )}
          <span>{insight.text}</span>
        </div>
      ))}

      <div className="pt-2">
        <Badge variant="accent" className="gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Gợi ý dựa trên lịch sử góp
        </Badge>
      </div>
    </div>
  );
}
