import Link from "next/link";
import { ArrowRight, Scale, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatVnd } from "@/components/finance/finance-format";
import { cn } from "@/lib/utils";
import type { MonthSummary } from "@/types/finance-dashboard";

// ADR-016 M2 — "Ba số": Két (tiền thật) · Lãi/lỗ (theo ngày chụp) · Công nợ (hiện tại).
// Ba khối tách riêng, không có ô nào trộn tiền két với lợi nhuận.

interface FinanceCompactBarProps {
  data: MonthSummary;
}

type Tone = "info" | "primary" | "warning";

const TONE: Record<Tone, string> = {
  info: "bg-info/10 text-info",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
};

interface LedgerCardProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  hint: string;
  value: number;
  badge?: string;
  rows: Array<[string, string, string?]>;
  caption: string;
  links: Array<{ href: string; label: string }>;
  warning?: { text: string; href: string };
}

function LedgerCard({ icon: Icon, tone, title, hint, value, badge, rows, caption, links, warning }: LedgerCardProps) {
  return (
    <article className="card-base flex min-w-0 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("icon-box shrink-0", TONE[tone])}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-body-sm font-semibold text-text-primary">{title}</h3>
            <p className="truncate text-caption text-text-muted">{hint}</p>
          </div>
        </div>
        {badge ? <Badge variant={value >= 0 ? "success" : "error"}>{badge}</Badge> : null}
      </div>

      <p className={cn("text-h2 font-bold tabular-nums", value >= 0 ? "text-success" : "text-error")}>
        {value > 0 ? "+" : ""}
        {formatVnd(value)}
      </p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map(([label, amount, href]) => (
          <div key={label} className="min-w-0">
            <dt className="text-caption text-text-muted">
              {href ? (
                <Link href={href} prefetch={false} className="hover:text-text-primary hover:underline">
                  {label}
                </Link>
              ) : (
                label
              )}
            </dt>
            <dd className="truncate text-body-sm font-semibold tabular-nums text-text-primary">{amount}</dd>
          </div>
        ))}
      </dl>

      <p className="text-caption text-text-muted">{caption}</p>

      {warning ? (
        <Link
          href={warning.href}
          prefetch={false}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-caption font-semibold text-warning hover:underline"
        >
          {warning.text}
        </Link>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className="inline-flex items-center gap-1 text-caption font-semibold text-interactive hover:underline"
          >
            {link.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
    </article>
  );
}

function formatPercent(value: number) {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

export function FinanceCompactBar({ data }: FinanceCompactBarProps) {
  const { cash, pnl, debt, month } = data;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <LedgerCard
        icon={Wallet}
        tone="info"
        title={`Két tháng ${month}`}
        hint="Tiền thật vào/ra theo ngày phiếu"
        value={cash.net}
        rows={[
          ["Thu", formatVnd(cash.in)],
          ["Chi", formatVnd(cash.out)],
        ]}
        caption={`Trả nợ ${formatVnd(cash.outSettlement)} · chi khác ${formatVnd(cash.outOther)}`}
        links={[{ href: "/finance/cashflow", label: "Sổ cái" }]}
      />

      <LedgerCard
        icon={TrendingUp}
        tone="primary"
        title={`Lãi/lỗ tháng ${month}`}
        hint="Doanh thu theo ngày chụp · chi phí cam kết"
        value={pnl.profit}
        badge={formatPercent(pnl.margin)}
        rows={[
          ["Doanh thu", formatVnd(pnl.revenue)],
          ["Chi phí", formatVnd(pnl.cost)],
        ]}
        caption={`${pnl.contractsShot} HĐ chụp trong tháng · thợ/ekip ${formatVnd(pnl.costTask)} · in ${formatVnd(pnl.costPrint)}`}
        warning={
          pnl.contractsMissingWorkDate > 0
            ? { text: `${pnl.contractsMissingWorkDate} HĐ đang chạy thiếu ngày chụp`, href: "/contracts" }
            : undefined
        }
        links={[{ href: "/reports", label: "Báo cáo" }]}
      />

      <LedgerCard
        icon={Scale}
        tone="warning"
        title="Công nợ hiện tại"
        hint="Khách nợ Mood − Mood nợ đối tác"
        value={debt.receivable - debt.payable}
        rows={[
          ["Phải thu", formatVnd(debt.receivable), "/finance/debts"],
          ["Phải trả", formatVnd(debt.payable), "/finance/payables"],
        ]}
        caption={`Đã giao chưa thu ${formatVnd(debt.receivableDue)} · chờ giao ${formatVnd(debt.receivableWaiting)} · nợ lab ${formatVnd(debt.payableLab)} · thợ ${formatVnd(debt.payableVendor)} · ekip ${formatVnd(debt.payableEmployee)} · NCC ${formatVnd(debt.payableSupplier)}`}
        links={[
          { href: "/finance/debts", label: "Phải thu" },
          { href: "/finance/payables", label: "Phải trả" },
        ]}
      />
    </div>
  );
}
