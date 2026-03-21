"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES } from "@/lib/navigation";
import { Home, MoreHorizontal, X } from "lucide-react";

interface BottomNavProps {
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

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = React.useState(false);

  /** Check nếu đang ở 1 module trong popup → highlight nút "Thêm" */
  const moreActive = MORE_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  /** iOS-style: tap active tab → scroll to top, tap inactive → navigate */
  const handleNavClick = React.useCallback(
    (e: React.MouseEvent, href: string, isActive: boolean) => {
      if (isActive) {
        e.preventDefault();
        scrollMainToTop();
      }
    },
    []
  );

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
            className="absolute bottom-20 right-2 bg-bg-card rounded-xl shadow-xl border border-border p-2 w-48 animate-in fade-in slide-in-from-bottom-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {MORE_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
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
          "lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-bg-card/90 backdrop-blur-lg border-t border-border flex items-center justify-around px-2 z-50 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]",
          className
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href, isActive)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[64px] transition-all duration-200 py-1",
                isActive ? "text-primary" : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon className={cn("w-[25px] h-[25px]", isActive && "stroke-[2.5px]")} />
              <span className={cn(
                "text-tiny",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {('shortLabel' in item && item.shortLabel) || item.label}
              </span>
            </Link>
          );
        })}

        {/* Nút "Thêm" */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 min-w-[64px] transition-all duration-200 py-1",
            showMore || moreActive
              ? "text-primary"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          {showMore ? (
            <X className="w-[25px] h-[25px] stroke-[2.5px]" />
          ) : (
            <MoreHorizontal className={cn("w-[25px] h-[25px]", moreActive && "stroke-[2.5px]")} />
          )}
          <span className={cn(
            "text-tiny",
            showMore || moreActive ? "font-semibold" : "font-medium"
          )}>
            Thêm
          </span>
        </button>
      </nav>
    </>
  );
}
