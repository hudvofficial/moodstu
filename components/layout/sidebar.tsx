"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role, ROLE_PERMISSIONS } from "@/types/roles";
import { MODULES, GROUP_LABELS, getMenuGroups } from "@/lib/navigation";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { logout } from "@/app/actions/auth";
import packageJson from "@/package.json";
import { clearSWRPersistCache } from "@/lib/swr-persist";
import { usePrefetchOnHover } from "@/lib/hooks/use-prefetch-on-hover";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Ban lãnh đạo",
  manager: "Quản lý",
  sale: "Kinh doanh",
  media: "Media",
  viewer: "Nhân viên",
};

interface SidebarProps {
  role: Role;
  userName?: string;
  className?: string;
}

export function Sidebar({ role, userName, className }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const prefetchOnHover = usePrefetchOnHover();

  const filteredMenu = MODULES.filter((item) =>
    ROLE_PERMISSIONS[role]?.includes(item.id)
  );

  const groups = getMenuGroups();
  const isRouteActive = React.useCallback(
    (href: string, matchPrefix?: string) =>
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      (matchPrefix
        ? pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`)
        : false),
    [pathname],
  );

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-bg-card shadow-(--shadow-sidebar) transition-all duration-300 ease-in-out z-20",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Logo Section — Click → Dashboard */}
      <Link
        href="/dashboard"
        prefetch
        className="p-4 flex items-center gap-3 overflow-hidden text-nowrap group hover:opacity-90 transition-opacity"
      >
        {/* Logo icon — V1 style: bo vuông nhẹ, nền primary, logo trắng */}
        <div className="w-12 h-12 shrink-0 rounded-sm bg-primary flex items-center justify-center shadow-sm p-2 transition-transform group-hover:scale-105">
          <Image
            src="/logo.png"
            alt="Mood Studio"
            width={40}
            height={40}
            className="object-contain w-full h-full brightness-0 invert"
          />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="font-bold text-dark tracking-tight leading-none text-lg">Mood Studio</span>
            <span className="text-micro font-bold text-text-muted uppercase tracking-[0.15em] mt-1">Hệ thống quản lý</span>
            <span className="text-micro font-semibold text-primary/70 leading-none mt-0.5">v{packageJson.version}</span>
          </div>
        )}
      </Link>

      {/* Navigation — Grouped like V1 */}
      <nav className="flex-1 px-3 overflow-y-auto pt-2 scrollbar-hide">
        {groups.map((groupKey) => {
          const groupItems = filteredMenu.filter((item) => item.group === groupKey);
          if (groupItems.length === 0) return null;

          return (
            <div key={groupKey} className="mb-1">
              {/* Group separator — V1: all groups (except first) have border-t */}
              {groups.indexOf(groupKey) > 0 && (
                <div className="mt-1 pt-2 border-t border-border/60 mx-2" />
              )}
              {/* Group label — only for groups with non-empty label */}
              {GROUP_LABELS[groupKey] && !isCollapsed && (
                <div className="px-3 py-1.5 mb-1">
                  <span className="text-tiny font-bold text-text-muted uppercase tracking-[0.15em]">
                    {GROUP_LABELS[groupKey]}
                  </span>
                </div>
              )}

              {/* Menu items */}
              <div className="space-y-0.5">
                {groupItems.map((item) => {
                  const isActive = isRouteActive(item.href, item.matchPrefix);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      prefetch
                      onPointerEnter={() => prefetchOnHover(item.href)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 active:scale-[0.98]",
                        isActive
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-text-secondary hover:bg-bg-hover hover:text-primary hover:shadow-sm"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-text-muted group-hover:text-primary transition-colors")} />
                      {!isCollapsed && (
                        <span className="text-sm font-semibold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
                          {item.shortLabel || item.label}
                        </span>
                      )}
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-14 invisible group-hover:visible bg-dark text-white text-tiny px-2 py-1 rounded-sm whitespace-nowrap z-50 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.shortLabel || item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer — User Profile + Logout (V1 style) */}
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center", isCollapsed ? "flex-col gap-3" : "justify-between gap-2")}>
          {/* User Info */}
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2.5 overflow-hidden")}>
            <div className="w-9 h-9 shrink-0 rounded-full bg-bg-hover border border-border flex items-center justify-center">
              <span className="text-sm font-bold text-text-muted">{userName?.charAt(0)?.toUpperCase() || "?"}</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-dark truncate leading-tight">{userName || "User"}</p>
                <p className="text-tiny text-text-muted font-semibold uppercase tracking-wide leading-tight mt-0.5">{ROLE_LABELS[role]}</p>
              </div>
            )}
          </div>

          {/* Logout */}
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              onClick={() => void clearSWRPersistCache()}
              className="w-8 h-8 rounded-sm text-text-muted hover:bg-error/5 hover:text-error transition-all group"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </Button>
          </form>
        </div>
      </div>

      {/* Collapse Toggle Button (Desktop Only) */}
      <Button
        variant="ghost"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-bg-card rounded-full items-center justify-center shadow-sm hover:shadow-md transition-shadow z-30 hidden lg:flex"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-primary" /> : <ChevronLeft className="w-3.5 h-3.5 text-primary" />}
      </Button>
    </aside>
  );
}
