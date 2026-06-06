"use client";

import { useState } from "react";
import { Plus, X, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { FAB } from "@/components/ui/fab";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { usePathname } from "next/navigation";

export function FinanceFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Hide FAB during print mode
  if (pathname.includes("/print")) return null;

  const actions = [
    {
      icon: TrendingUp,
      label: "Phiếu thu mới",
      href: "/finance/receipts?new=1",
      color: "text-success",
      delay: "delay-150",
    },
    {
      icon: TrendingDown,
      label: "Phiếu chi mới",
      href: "/finance/expenses?new=1",
      color: "text-error",
      delay: "delay-100",
    },
    {
      icon: Sparkles,
      label: "Trợ lý AI",
      href: "/finance?chat=open",
      color: "text-primary",
      delay: "delay-75",
    },
  ];

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/20 will-change-opacity transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* 2. Speed Dial Container */}
      {/* Vị trí được thiết kế để khớp với thanh Bottom Nav trên Mobile (bottom-24) và Desktop (bottom-8) */}
      <div className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-50 flex flex-col items-end gap-3 pointer-events-none">
        
        {/* Floating Actions List */}
        <div className="flex flex-col items-end gap-3 mb-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 transition-[transform,opacity] duration-300 will-change-transform pointer-events-none group",
                  isOpen 
                    ? `opacity-100 translate-y-0 pointer-events-auto ${action.delay}` 
                    : "opacity-0 translate-y-8"
                )}
              >
                <div className="bg-bg-card px-3 py-1.5 rounded-lg shadow-float text-sm font-medium text-text-primary whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
                  {action.label}
                </div>
                {/* eslint-disable-next-line react/forbid-elements -- Override global .btn */}
                <button
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full bg-bg-card shadow-float transition-all hover:scale-105 active:scale-95 border-none outline-none cursor-pointer",
                    action.color
                  )}
                  aria-label={action.label}
                  tabIndex={-1}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </Link>
            );
          })}
        </div>

        {/* Main Trigger FAB (Reusing SSOT Primitive) */}
        <div className="pointer-events-auto">
          <FAB 
            icon={isOpen ? X : Plus} 
            onClick={() => setIsOpen(!isOpen)} 
            wrapperClassName="relative bottom-0 right-0 block lg:block z-50 transition-transform duration-300 group"
            className={isOpen ? "rotate-90 bg-bg-card text-text-primary" : ""}
          />
        </div>
      </div>
    </>
  );
}
