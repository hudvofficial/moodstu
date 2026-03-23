"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { getModuleFromPath } from "@/lib/navigation";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { useScrollContainer } from "@/contexts/scroll-container";
import { Search, X } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import { useHeaderSlotsContext } from "@/contexts/header-slots-context";

// ──── Props ────
interface HeaderProps {
  className?: string;
  /** Override left section (default: Logo link) */
  leftSlot?: React.ReactNode;
  /** Override center title (default: module label from navigation.ts) */
  titleOverride?: string;
  /** Override center subtitle (default: module description) */
  subtitleOverride?: string;
  /** Override right section (default: Search + ThemeToggle + Bell) */
  rightSlot?: React.ReactNode;
  /** Hide search bar entirely (useful for detail pages) */
  hideSearch?: boolean;
}

export function Header({ className, leftSlot: leftSlotProp, titleOverride: titleOverrideProp, subtitleOverride: subtitleOverrideProp, rightSlot: rightSlotProp, hideSearch: hideSearchProp }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentModule = getModuleFromPath(pathname);
  const scrollRef = useScrollContainer();
  const { isVisible } = useScrollDirection({ threshold: 60, containerRef: scrollRef });

  // Merge: props > context > defaults
  const ctx = useHeaderSlotsContext();
  const leftSlot = leftSlotProp ?? ctx.leftSlot;
  const titleOverride = titleOverrideProp ?? ctx.titleOverride;
  const subtitleOverride = subtitleOverrideProp ?? ctx.subtitleOverride;
  const rightSlot = rightSlotProp ?? ctx.rightSlot;
  const hideSearch = hideSearchProp ?? ctx.hideSearch;
  const [isSearchVisible, setIsSearchVisible] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState(searchParams.get('q') || "");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic placeholder from navigation.ts SSOT
  const searchPlaceholder = `Tìm trong ${currentModule.shortLabel || currentModule.label}...`;

  // Focus mobile search input when overlay opens
  React.useEffect(() => {
    if (isSearchVisible && searchRef.current) searchRef.current.focus();
  }, [isSearchVisible]);

  // Sync local state when URL params change externally (e.g. back/forward)
  React.useEffect(() => {
    setSearchTerm(searchParams.get('q') || "");
  }, [searchParams]);

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Debounced URL update — local state instant, URL after 300ms
  const handleSearchChange = React.useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('q', value.trim());
      } else {
        params.delete('q');
      }
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    }, 300);
  }, [pathname, router, searchParams]);

  // Clear search — instant clear local + URL
  const handleClearSearch = React.useCallback(() => {
    setSearchTerm("");
    setIsSearchVisible(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [pathname, router, searchParams]);

  return (
    <header
      className={cn(
        "sticky top-0 z-(--z-header) bg-bg-card shadow-(--shadow-header) print:hidden transition-[transform,margin] duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "-translate-y-full -mb-(--header-mobile-h) lg:translate-y-0 lg:mb-0",
        className
      )}
    >
      {/* ═══════ MOBILE: Search Overlay ═══════ */}
      {isSearchVisible ? (
        <div className="lg:hidden px-4 py-1.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                ref={searchRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="search-input pl-9"
              />
            </div>
            <button
              onClick={handleClearSearch}
              className="icon-btn"
              aria-label="Đóng tìm kiếm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between h-(--header-mobile-h) px-4 lg:h-(--header-desktop-h) lg:px-8">
          {/* ── Left: Custom slot or default Logo (mobile only) ── */}
          <div className="flex items-center gap-2.5 min-w-0">
            {leftSlot || (
              <Link
                href="/dashboard"
                onClick={(e) => {
                  if (pathname === "/dashboard") {
                    e.preventDefault();
                    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="lg:hidden active:scale-95 transition-transform shrink-0"
              >
                <div className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center p-1 shadow-sm">
                  <Image
                    src="/logo.png"
                    alt="Mood Studio"
                    fill
                    className="object-contain brightness-0 invert p-1.5"
                  />
                </div>
              </Link>
            )}
          </div>

          {/* ── Center: Title + Subtitle (overridable — mobile only, desktop keeps module label) ── */}
          <div className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-160px)] lg:static lg:translate-x-0 lg:max-w-none lg:flex-1 lg:ml-2 flex flex-col min-w-0">
            <h1 className="text-h3 truncate">
              {titleOverride ? (
                <>
                  <span className="lg:hidden">{titleOverride}</span>
                  <span className="hidden lg:inline">{currentModule.label}</span>
                </>
              ) : currentModule.label}
            </h1>
            {(subtitleOverride ?? currentModule.description) && (
              <p className="hidden lg:block text-caption truncate">
                {subtitleOverride ?? currentModule.description}
              </p>
            )}
          </div>

          {/* ── Right: Actions (rightSlot replaces MOBILE section only, desktop always keeps defaults) ── */}
          <div className="flex items-center gap-1 lg:gap-4 shrink-0">

            {/* Mobile: custom slot or default search icon */}
            {rightSlot ? (
              <div className="lg:hidden flex items-center gap-1">{rightSlot}</div>
            ) : (
              !hideSearch && (
                <div className="lg:hidden">
                  <button
                    onClick={() => setIsSearchVisible(true)}
                    className="icon-btn"
                    aria-label="Tìm kiếm"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              )
            )}

            {/* Desktop search input (always, unless hideSearch) */}
            {!hideSearch && (
              <div className="relative hidden lg:block">
                <div className="relative w-64">
                  {!searchTerm && (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  )}
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={`search-input pr-14 ${searchTerm ? "pl-4" : "pl-9"}`}
                  />
                  {/* ⌘K badge */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none flex items-center gap-0.5">
                    <span className="kbd-badge">⌘</span>
                    <span className="kbd-badge">K</span>
                  </div>
                </div>
              </div>
            )}

            {/* Theme toggle — desktop only */}
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Notification bell — hidden on mobile when rightSlot is set */}
            <div className={cn(rightSlot && "max-lg:hidden")}>
              <NotificationBell />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
