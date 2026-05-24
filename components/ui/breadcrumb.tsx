"use client";

/**
 * ═══════════════════════════════════════════════════════════
 * Breadcrumb — Shared navigation breadcrumb
 * ═══════════════════════════════════════════════════════════
 *
 * Pure Functional Component — no state, no hooks.
 * CSS tokens: .breadcrumb, .breadcrumb-link, .breadcrumb-separator, .breadcrumb-current
 * Defined in: app/styles/components.css
 *
 * Usage:
 *   <Breadcrumb items={[
 *     { label: "Nhân viên", href: "/employees" },
 *     { label: "Nguyễn Văn A" },
 *   ]} />
 * ═══════════════════════════════════════════════════════════
 */

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────
interface BreadcrumbItem {
  label: string;
  href?: string; // undefined = current page (last item)
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

// ── Component ─────────────────────────────────────────────
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("breadcrumb flex items-center", className)}>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <ChevronRight size={14} className="breadcrumb-separator" />
          )}
          {item.href ? (
            <Link href={item.href} prefetch={false} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
