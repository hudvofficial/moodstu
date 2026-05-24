"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES } from "@/lib/navigation";
import { ROLE_PERMISSIONS, type Role } from "@/types/roles";
import { Home, MoreHorizontal, X, Loader2 } from "lucide-react";
import { prewarmRouteData } from "@/lib/navigation-data-prefetch";
import { haptic } from "@/lib/haptic";

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

  // Hide BottomNav during print mode
  if (pathname.includes("/print")) return null;

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

      {/* Bottom Nav Bar */}
      <nav
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card/90 backdrop-blur-lg border-t border-border shadow-bottom-nav nav-safe-padding",
          className
        )}
      >
        <div className="flex items-start justify-around px-2 pt-2 w-full">
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
                  "flex flex-col items-center justify-center gap-0.5 min-w-16 transition-all duration-200 pt-1.5 pb-1 rounded-lg",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                  isActive || isPending ? "text-primary" : "text-text-muted hover:text-text-secondary"
                )}
              >
                {isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin stroke-[2.5px]" />
                ) : (
                  <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                )}
                <span className={cn(
                  "text-tiny",
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
              "flex flex-col items-center justify-center gap-0.5 min-w-16 transition-all duration-200 pt-1.5 pb-1 cursor-pointer rounded-lg",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
              showMore || moreActive
                ? "text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {showMore ? (
              <X className="w-6 h-6 stroke-[2.5px]" />
            ) : (
              <MoreHorizontal className={cn("w-6 h-6", moreActive && "stroke-[2.5px]")} />
            )}
            <span className={cn(
              "text-tiny",
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
