import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  Flag,
  Landmark,
  Layers,
  Lock,
  ReceiptText,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type QuickNavTone = "emerald" | "red" | "blue" | "orange" | "indigo" | "neutral" | "teal" | "violet" | "amber";

interface QuickNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: QuickNavTone;
}

const NAV_ITEMS: QuickNavItem[] = [
  { href: "/finance/receipts", label: "Phiếu thu", description: "Dòng tiền vào", icon: ReceiptText, tone: "emerald" },
  { href: "/finance/expenses", label: "Phiếu chi", description: "Chi phí vận hành", icon: Wallet, tone: "red" },
  { href: "/finance/cashflow", label: "Sổ cái", description: "Thu chi tổng hợp", icon: BookOpen, tone: "blue" },
  { href: "/finance/debts", label: "Công nợ KH", description: "Khoản cần thu", icon: Landmark, tone: "orange" },
  { href: "/finance/salaries", label: "Bảng lương", description: "Lương nhân sự", icon: BadgeCheck, tone: "indigo" },
  { href: "/finance/categories", label: "Danh mục", description: "Nhóm thu chi", icon: Layers, tone: "neutral" },
  { href: "/finance/investments", label: "Tài sản", description: "Đầu tư studio", icon: TrendingUp, tone: "teal" },
  { href: "/finance/goals", label: "Mục tiêu", description: "Kế hoạch tiền", icon: Flag, tone: "violet" },
  { href: "/finance/closes", label: "Chốt sổ", description: "Khóa kỳ tháng", icon: Lock, tone: "amber" },
];

const toneClasses: Record<QuickNavTone, { icon: string; text: string; border: string }> = {
  emerald: { icon: "bg-success/10 text-success", text: "text-success", border: "hover:border-success/40" },
  red: { icon: "bg-error/10 text-error", text: "text-error", border: "hover:border-error/40" },
  blue: { icon: "bg-info/10 text-info", text: "text-info", border: "hover:border-info/40" },
  orange: { icon: "bg-warning/10 text-warning", text: "text-warning", border: "hover:border-warning/40" },
  indigo: { icon: "bg-primary/10 text-primary", text: "text-primary", border: "hover:border-primary/40" },
  neutral: { icon: "bg-bg-muted text-text-secondary", text: "text-text-secondary", border: "hover:border-border" },
  teal: { icon: "bg-success/10 text-success", text: "text-success", border: "hover:border-success/40" },
  violet: { icon: "bg-info/10 text-info", text: "text-info", border: "hover:border-info/40" },
  amber: { icon: "bg-warning/10 text-warning", text: "text-warning", border: "hover:border-warning/40" },
};

export function FinanceQuickNav() {
  return (
    <section className="entrance entrance-1">
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-9">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const tone = toneClasses[item.tone];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "card-interactive flex min-h-24 flex-col items-center justify-center gap-2 p-3 text-center",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                tone.border,
              )}
            >
              <span className={cn("icon-box", tone.icon)}>
                <Icon className="h-4 w-4" />
              </span>
              <span className={cn("text-body-sm font-semibold leading-tight", tone.text)}>{item.label}</span>
              <span className="hidden text-caption leading-tight text-text-muted xl:block">{item.description}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
