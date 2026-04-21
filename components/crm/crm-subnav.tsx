"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CrmSubnavItem {
  href: string;
  label: string;
  count?: number;
}

export const CRM_PRIMARY_NAV: CrmSubnavItem[] = [
  { href: "/crm/leads", label: "DS Sale" },
  { href: "/crm/customers", label: "Hồ sơ KH" },
];

interface CrmSubnavProps {
  items?: CrmSubnavItem[];
  activeHref: string;
  className?: string;
}

export function CrmSubnav({
  items = CRM_PRIMARY_NAV,
  activeHref,
  className,
}: CrmSubnavProps) {
  return (
    <nav className={cn("flex items-center gap-2", className)} aria-label="CRM modules">
      {items.map((item) => {
        const isActive = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-primary/10 text-primary shadow-xs"
                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
            )}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-tiny font-semibold",
                  isActive
                    ? "bg-primary/12 text-primary"
                    : "bg-bg-hover text-text-muted",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
