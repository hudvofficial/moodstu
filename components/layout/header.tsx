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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/theme/ThemeToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import { useHeaderSlotsContext } from "@/contexts/header-slots-context";
import { usePullDistance } from "@/contexts/pull-to-refresh-context";
import { useIsMobile } from "@/hooks/use-mobile";

// ──── Props ────
interface HeaderProps {
  className?: string;
  leftSlot?: React.ReactNode;
  titleOverride?: string;
  subtitleOverride?: string;
  rightSlot?: React.ReactNode;
  hideSearch?: boolean;
}

export function Header({
  className,
  leftSlot: leftSlotProp,
  titleOverride: titleOverrideProp,
  subtitleOverride: subtitleOverrideProp,
  rightSlot: rightSlotProp,
  hideSearch: hideSearchProp
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentModule = getModuleFromPath(pathname);
  const scrollRef = useScrollContainer();
  const isMobile = useIsMobile();

  const ctx = useHeaderSlotsContext();
  const leftSlot = leftSlotProp ?? ctx.leftSlot;
  const titleOverride = titleOverrideProp ?? ctx.titleOverride;
  const subtitleOverride = subtitleOverrideProp ?? ctx.subtitleOverride;
  const rightSlot = rightSlotProp ?? ctx.rightSlot;
  const hideSearch = hideSearchProp ?? ctx.hideSearch;
  const hideHeader = ctx.hideHeader;

  const headerRef = React.useRef<HTMLElement>(null);

  // Scroll hide/show with iOS-optimized thresholds
  const { isVisible } = useScrollDirection({
    threshold: 80,
    containerRef: scrollRef,
    headerRef: headerRef,
    resetKey: pathname,
  });

  const pullDistance = usePullDistance();

  const [isSearchVisible, setIsSearchVisible] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState(searchParams.get('q') || "");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlaceholder = `Tìm trong ${currentModule.shortLabel || currentModule.label}...`;

  React.useEffect(() => {
    if (isSearchVisible && searchRef.current) searchRef.current.focus();
  }, [isSearchVisible]);

  React.useEffect(() => {
    setSearchTerm(searchParams.get('q') || "");
  }, [searchParams]);

  React.useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // FIX: Use fresh pathname from window.location instead of stale closure
      const currentPath = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (value.trim()) {
        params.set('q', value.trim());
      } else {
        params.delete('q');
      }
      router.replace(params.toString() ? `${currentPath}?${params.toString()}` : currentPath, { scroll: false });
    }, 300);
  }, [router]);

  const handleClearSearch = React.useCallback(() => {
    setSearchTerm("");
    setIsSearchVisible(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // FIX: Use fresh pathname from window.location
    const currentPath = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    router.replace(params.toString() ? `${currentPath}?${params.toString()}` : currentPath, { scroll: false });
  }, [router]);

  // shadowOpacity is now handled natively via --header-shadow-opacity by useScrollDirection.
  // We only reset it if pullDistance > 0.
  React.useEffect(() => {
    if (isMobile && pullDistance > 0) {
      document.documentElement.style.setProperty('--header-shadow-opacity', '0');
    }
  }, [pullDistance, isMobile]);

  if (hideHeader) return null;

  // Calculate transform: pull-to-refresh takes priority, then hide/show via CSS var
  const getTransform = () => {
    if (pullDistance > 0) {
      return `translateY(${pullDistance}px)`;
    }
    return 'translateY(var(--header-translate-y, 0px))';
  };

  // Calculate transition: different for pull vs hide/show
  const getTransition = () => {
    if (pullDistance > 0) {
      return 'none'; // No transition while pulling
    }
    return 'var(--header-transition, transform 0.3s ease)';
  };

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-(--z-header) bg-bg-card shadow-(--shadow-header) print:hidden",
        "max-lg:fixed max-lg:inset-x-0 max-lg:pt-[env(safe-area-inset-top)] max-lg:shadow-none",
        className
      )}
      style={{
        ...(isMobile ? {
          // Mobile-only: pull-to-refresh transform and dynamic shadow via CSS variable
          transform: getTransform(),
          transition: getTransition(),
          boxShadow: `0 2px 8px -2px rgba(0, 0, 0, calc(0.06 * var(--header-shadow-opacity, 1)))`,
          willChange: pullDistance > 0 ? 'transform' : 'auto', // Optimize pull-to-refresh
        } : {}),
      }}
    >
      {/* ═══════ MOBILE: Search Overlay ═══════ */}
      {isSearchVisible ? (
        <div className="lg:hidden px-4 py-1.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                ref={searchRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="search-input pl-9"
              />
            </div>
            <Button
              type="button"
              variant="icon"
              onClick={handleClearSearch}
              aria-label="Đóng tìm kiếm"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between h-(--header-mobile-h) px-4 lg:h-(--header-desktop-h) lg:px-8">
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

          <div className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-120px)] sm:max-w-[calc(100%-160px)] lg:static lg:translate-x-0 lg:max-w-none lg:flex-1 lg:ml-2 flex flex-col min-w-0">
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

          <div className="flex items-center gap-1 lg:gap-4 shrink-0">
            {rightSlot ? (
              <div className="lg:hidden flex items-center gap-1">{rightSlot}</div>
            ) : (
              !hideSearch && (
                <div className="lg:hidden">
                  <Button
                    type="button"
                    variant="icon"
                    onClick={() => setIsSearchVisible(true)}
                    aria-label="Tìm kiếm"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
              )
            )}

            {!hideSearch && (
              <div className="relative hidden lg:block">
                <div className="relative w-64">
                  {!searchTerm && (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  )}
                  <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={`search-input pr-14 ${searchTerm ? "pl-4" : "pl-9"}`}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none flex items-center gap-0.5">
                    <span className="kbd-badge">⌘</span>
                    <span className="kbd-badge">K</span>
                  </div>
                </div>
              </div>
            )}

            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            <div className={cn(rightSlot && "max-lg:hidden")}>
              <NotificationBell />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
