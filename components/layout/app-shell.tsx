"use client";
/* eslint-disable react/forbid-elements */

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Role } from "@/types/roles";
import { X } from "lucide-react";
import { ScrollContainerProvider } from "@/contexts/scroll-container";
import { HeaderSlotsProvider } from "@/contexts/header-slots-context";
import { PullToRefreshProvider } from "@/contexts/pull-to-refresh-context";
import { NavigationWarmup } from "./navigation-warmup";
import { NavigationProgress } from "./navigation-progress";

// Routes that hide BOTH Header + BottomNav (currently unused)
const FULLPAGE_PATTERNS: RegExp[] = [
  /\/print(\/.*)?$/, // Hide app frame layout for active printing previews, tolerating trailing slashes or sub-paths
];

// Routes that use absolute viewports (ban scrolling)
const APP_VIEW_PATTERNS = [
  /^\/calendar(\/.*)?$/,
];

// Routes that keep Header but lock the page viewport like a workspace
const CHAT_VIEW_PATTERNS = [
  /^\/moodie(\/.*)?$/,
];

// Routes that keep Header (via HeaderSlotsContext) but hide BottomNav
// (form pages have their own fixed footer: Hủy / Lưu nháp / Tạo HĐ)
const FORM_PAGE_PATTERNS = [
  /^\/contracts\/create$/,
  /^\/contracts\/[^/]+\/edit$/,
  /^\/services\/[^/]+\/quote$/,
];

// Routes that keep Header + BottomNav but remove main padding
// (e.g. gallery page needs sticky header flush to top)
const GALLERY_VIEW_PATTERNS = [
  /\/contracts\/[^/]+\/gallery/,
];

interface AppShellProps {
  children: React.ReactNode;
  role: Role;
  userName?: string;
}

export function AppShell({ children, role, userName }: AppShellProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Fullpage mode: hide Header + BottomNav, form handles its own chrome
  const isFullpage = FULLPAGE_PATTERNS.some(p => p.test(pathname));
  const isAppView = APP_VIEW_PATTERNS.some(p => p.test(pathname));
  const isChatView = CHAT_VIEW_PATTERNS.some(p => p.test(pathname));
  const isFormPage = FORM_PAGE_PATTERNS.some(p => p.test(pathname));
  const isGalleryView = GALLERY_VIEW_PATTERNS.some(p => p.test(pathname));

  // Ref to the main scroll container — shared via context
  const mainRef = React.useRef<HTMLElement>(null);

  // Close mobile menu on route change or screen resize
  React.useEffect(() => {
    if (!isMobile) setIsMobileMenuOpen(false);
  }, [isMobile]);

  return (
    <div className="app-shell-viewport flex bg-bg-base overflow-hidden">
      <NavigationWarmup role={role} />
      <NavigationProgress />

      {/* 1. Sidebar (Desktop & Tablet) */}
      {!isFullpage && (
        <Sidebar 
          role={role}
          userName={userName}
          className={cn(
            "hidden lg:flex",
            isTablet && "w-20"
          )} 
        />
      )}

      {/* 2. Mobile Drawer (Sidebar on Mobile) */}
      {!isFullpage && isMobileMenuOpen && (
        <div className="fixed inset-0 z-100 lg:hidden animate-in fade-in duration-300">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-dark/60 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Content */}
          <div className="absolute left-0 top-0 bottom-0 w-70 bg-bg-card shadow-2xl animate-in slide-in-from-left duration-500">
            <div className="absolute top-4 right-4 z-50">
               <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-bg-hover rounded-full text-text-muted hover:text-dark transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
            <Sidebar role={role} userName={userName} className="w-full h-full" />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <HeaderSlotsProvider>
          <ScrollContainerProvider value={mainRef}>
            {!isFullpage && <Header />}
          
            <main
              ref={mainRef}
              id="main-scroll"
              className={cn(
              "flex-1 scroll-smooth flex flex-col min-h-0 relative",
              isAppView || isChatView ? "overflow-hidden" : "overflow-y-auto",
              isFullpage
                ? "" // FullpageFormShell handles its own padding
                : isChatView
                  ? "p-0"
                : isAppView
                  ? "px-0 max-lg:pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0 max-lg:pb-[calc(3.5rem+max(0.5rem,env(safe-area-inset-bottom)))] md:px-6 md:py-6 lg:px-6 lg:pb-6"
                : isFormPage
                  ? "px-2 max-lg:pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0 pb-4 lg:px-6 lg:py-6" // Form padding, no pb-28 (form footer handles)
                  : isGalleryView
                    ? "pt-0 lg:pb-6" // Gallery handles its own top padding via GalleryToolbar
                    : "px-2 max-lg:pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0 max-lg:pb-[calc(3.5rem+max(0.5rem,env(safe-area-inset-bottom)))] md:px-6 md:py-6 lg:px-6 lg:pb-6",
              "bg-linear-to-tr from-primary/5 via-transparent to-accent/5"
            )}>
              <PullToRefreshProvider
                scrollRef={mainRef}
                disabled={isAppView || isChatView || isFormPage || isFullpage}
              >
                {children}
              </PullToRefreshProvider>
            </main>

            {!(isFullpage || isFormPage || isChatView || isGalleryView) && <BottomNav role={role} />}
          </ScrollContainerProvider>
        </HeaderSlotsProvider>
      </div>
    </div>
  );
}
