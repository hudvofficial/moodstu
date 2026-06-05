"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES } from "@/lib/navigation";
import { ROLE_PERMISSIONS, type Role } from "@/types/roles";
import { Home, MoreHorizontal, X } from "lucide-react";
import { prewarmRouteData } from "@/lib/navigation-data-prefetch";
import { haptic } from "@/lib/haptic";
import { useVirtualKeyboard } from "@/hooks/use-virtual-keyboard";

interface BottomNavProps {
  role: Role;
  className?: string;
}

/** Bottom nav: 4 module chính + "Thêm" popup (kiểu mcoffe) */
const BOTTOM_NAV_IDS = ["contracts", "calendar", "crm"];
const NAV_ITEMS = [
  { id: "dashboard", label: "Trang chủ", href: "/dashboard", icon: Home, description: "", shortLabel: "Home" },
  ...MODULES.filter((m) => BOTTOM_NAV_IDS.includes(m.id)),
];

/** Modules hiện trong popup "Thêm" — lọc ra những module KHÔNG nằm trong bottom nav */
const MORE_ITEMS = MODULES.filter((m) => !BOTTOM_NAV_IDS.includes(m.id));

/** Scroll main content area to top smoothly */
function scrollMainToTop() {
  const main = document.querySelector("main");
  if (main) main.scrollTo({ top: 0, behavior: "smooth" });
}

function isItemActive(
  pathname: string,
  item: { href: string; matchPrefix?: string },
  exact = false,
) {
  if (exact && !item.matchPrefix) return pathname === item.href;
  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    (item.matchPrefix
      ? pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
      : false)
  );
}

export function BottomNav({ role, className }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const allowed = React.useMemo(
    () => new Set(ROLE_PERMISSIONS[role] || []),
    [role],
  );
  const navItems = React.useMemo(
    () =>
      NAV_ITEMS.filter((item) => item.id === "dashboard" || allowed.has(item.id)),
    [allowed],
  );
  const moreItems = React.useMemo(
    () => MORE_ITEMS.filter((item) => allowed.has(item.id)),
    [allowed],
  );
  const warmRoute = React.useCallback(
    (href: string) => {
      if (pathname === href || pathname.startsWith(`${href}/`)) return;
      router.prefetch(href);
      prewarmRouteData(href);
    },
    [pathname, router],
  );

  const markPending = React.useCallback(
    (href: string) => {
      if (pathname !== href && !pathname.startsWith(`${href}/`)) {
        setPendingHref(href);
      }
      warmRoute(href);
    },
    [pathname, warmRoute],
  );

  /** Check nếu đang ở 1 module trong popup → highlight nút "Thêm" */
  const moreActive = moreItems.some((item) => isItemActive(pathname, item));

  /** iOS-style: tap active tab → scroll to top, tap inactive → navigate */
  const handleNavClick = React.useCallback(
    (e: React.MouseEvent, href: string, isActive: boolean) => {
      haptic("light");
      if (isActive) {
        e.preventDefault();
        scrollMainToTop();
        return;
      }
      markPending(href);
    },
    [markPending],
  );

  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  React.useEffect(() => {
    if (!showMore) return;

    const timers = moreItems.slice(0, 8).map((item, index) =>
      window.setTimeout(() => warmRoute(item.href), index * 80),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [moreItems, showMore, warmRoute]);

  const isKeyboardOpen = useVirtualKeyboard();

  // Hide BottomNav during print mode or when virtual keyboard is open
  // Ẩn nav khi xem trang IN (vd /contracts/[id]/print, /finance/expenses/[id]/print).
  // KHÔNG ẩn /printing (quản lý xưởng in) hay /printing/labs.
  if (pathname.endsWith("/print")) return null;
  if (isKeyboardOpen) return null;

  return (
    <>
      {/* Popup overlay + danh sách module */}
      {showMore && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setShowMore(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Popup */}
          <div
            className="absolute nav-popup-offset right-2 bg-bg-card rounded-xl shadow-float p-2 w-48 animate-in fade-in slide-in-from-bottom-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {moreItems.map((item) => {
              const isActive = isItemActive(pathname, item);
              const isPending = pendingHref === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch
                  onPointerEnter={() => warmRoute(item.href)}
                  onFocus={() => warmRoute(item.href)}
                  onClick={() => {
                    markPending(item.href);
                    setShowMore(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive || isPending
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-bg-hover"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-body-sm font-medium">
                    {item.shortLabel || item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Nav Bar — SOLID bg + NATURAL height (v1 pattern). No forced inner
          height: a fixed 56px row would center the icons and leave dead white
          space below them, which together with the safe-area pad reads as a gap
          above the home indicator. Instead: pt-2 on top, content height in the
          middle, pb carries the iOS safe-area — so icons sit snug like v1. */}
      <nav
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50 w-full bg-bg-card border-t border-border shadow-bottom-nav px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          className
        )}
      >
        <div className="flex items-center justify-around h-16 w-full">
          {navItems.map((item) => {
            const isActive = isItemActive(pathname, item, true);
            const isPending = pendingHref === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch
                onPointerEnter={() => warmRoute(item.href)}
                onFocus={() => warmRoute(item.href)}
                onClick={(e) => handleNavClick(e, item.href, isActive)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-16 h-full transition-all duration-200 rounded-lg",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                  isActive || isPending ? "text-primary" : "text-text-muted hover:text-text-secondary"
                )}
              >
                {/* Native feel: tab highlight tức thì khi bấm (isPending → text-primary + stroke đậm);
                    KHÔNG spinner trên icon — thanh progress trên đầu (NextTopLoader, app/layout) lo việc đó. */}
                <Icon className={cn("w-[26px] h-[26px]", (isActive || isPending) && "stroke-[2.5px]")} />
                <span className={cn(
                  "text-[11px]",
                  isActive || isPending ? "font-semibold" : "font-medium"
                )}>
                  {('shortLabel' in item && item.shortLabel) || item.label}
                </span>
              </Link>
            );
          })}

          {/* Nút "Thêm" */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              haptic("light");
              setShowMore(!showMore);
            }}
            onPointerEnter={() => moreItems.slice(0, 4).forEach((item) => warmRoute(item.href))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowMore(!showMore); } }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-16 h-full transition-all duration-200 cursor-pointer rounded-lg",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
              showMore || moreActive
                ? "text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {showMore ? (
              <X className="w-[26px] h-[26px] stroke-[2.5px]" />
            ) : (
              <MoreHorizontal className={cn("w-[26px] h-[26px]", moreActive && "stroke-[2.5px]")} />
            )}
            <span className={cn(
              "text-[11px]",
              showMore || moreActive ? "font-semibold" : "font-medium"
            )}>
              Thêm
            </span>
          </div>
        </div>
      </nav>
    </>
  );
}
