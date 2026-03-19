"use client";

/**
 * 📊 CompactStats — Mockup-matched inline stats bar
 *
 * Warm cream container with mini-card stats:
 * - Large bold values
 * - Small labels below
 * - Icon badges with colored backgrounds
 */

import { FileText, Zap, DollarSign, CheckCircle } from "lucide-react";
import type { ContractStats } from "@/types/contract";
import { CURRENCY_SYMBOL } from "@/lib/utils";

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return (
      new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
        amount / 1_000_000
      ) + "M " + CURRENCY_SYMBOL
    );
  }
  return new Intl.NumberFormat("vi-VN").format(amount) + " " + CURRENCY_SYMBOL;
}

interface CompactStatsProps {
  stats: ContractStats;
}

export function CompactStats({ stats }: CompactStatsProps) {
  const items = [
    {
      icon: FileText,
      label: "tổng",
      value: String(stats.total),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: Zap,
      label: "đang thực hiện",
      value: String(stats.active),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
    {
      icon: DollarSign,
      label: "doanh thu",
      value: formatCompact(stats.revenue),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      icon: CheckCircle,
      label: "hoàn thành",
      value: String(stats.completed),
      iconBg: "bg-success/10",
      iconColor: "text-success",
      trend: stats.growth.completed,
    },
  ];

  // Mobile: same items + "nợ" card (desktop stays 4 items)
  const mobileItems = [
    ...items,
    {
      icon: DollarSign,
      label: "nợ",
      value: formatCompact(stats.outstanding),
      iconBg: "bg-error/10",
      iconColor: "text-error",
    },
  ];

  return (
    <>
      {/* ── MOBILE: Stitch Mini Cards — same items as desktop (lg:hidden) ──
       *  Stitch source: flex gap-3 px-4 mb-6, each card min-w-[120px] bg-white
       *  p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col gap-1
       */}
      <div className="lg:hidden flex gap-3 px-2 mb-4 overflow-x-auto scrollbar-hide">
        {mobileItems.map((item) => (
          <div key={item.label} className="min-w-[160px] bg-bg-card px-5 py-5 rounded-xl shadow-sm flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">{item.label}</span>
            <span className={`text-amount ${item.iconColor}`}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: Original stats bar (hidden on mobile) ── */}
      <div className="hidden lg:flex items-center gap-5 overflow-x-auto no-scrollbar">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3 shrink-0">
            {i > 0 && (
              <div className="w-px h-6 bg-text-muted/20 mr-1" />
            )}
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-xl ${item.iconBg}`}
            >
              <item.icon className={`w-4.5 h-4.5 ${item.iconColor}`} />
            </div>
            <span className="text-body font-bold text-text-main">
              {item.value}
            </span>
            <span className="text-sm text-text-muted">
              {item.label}
            </span>
            {item.trend !== undefined && item.trend !== 0 && (
              <span
                className={`text-xs font-semibold ${
                  item.trend > 0 ? "text-success" : "text-error"
                }`}
              >
                {item.trend > 0 ? "+" : ""}
                {item.trend}%
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
