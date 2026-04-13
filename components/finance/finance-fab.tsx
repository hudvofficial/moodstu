"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FinanceFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (path: string) => {
    setIsOpen(false);
    // You could also open modals here by dispatching global events
    router.push(path);
  };

  const actions = [
    {
      label: "Tạo Phiếu thu",
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
      delay: "delay-150",
      onClick: () => handleAction("/finance/receipts"),
    },
    {
      label: "Tạo Phiếu chi",
      icon: TrendingDown,
      color: "text-error",
      bg: "bg-error/10",
      delay: "delay-100",
      onClick: () => handleAction("/finance/expenses"),
    },
    {
      label: "Hỏi Moodie Cố vấn",
      icon: Sparkles,
      color: "text-primary",
      bg: "bg-primary/10",
      delay: "delay-75",
      onClick: () => {
        setIsOpen(false);
        // Call Moodie global AI command
        window.dispatchEvent(new CustomEvent("open-moodie-ai", { detail: { mode: "finance" } }));
      },
    },
  ];

  return (
    <div ref={fabRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Action panel */}
      {isOpen && (
        <div className="flex flex-col gap-2 mb-2 pointer-events-auto">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-3 bg-background shadow-md rounded-full py-2! px-4! transition-transform hover:scale-105 active:scale-95 animate-in slide-in-from-bottom-4 fade-in min-h-[44px]",
                  action.delay
                )}
              >
                <span className="text-body-sm font-medium">{action.label}</span>
                <div className={cn("p-1.5 rounded-full shrink-0", action.bg)}>
                  <Icon className={cn("w-4 h-4", action.color)} />
                </div>
              </Button>
            );
          })}
        </div>
      )}

      {/* Main button */}
      <Button
        variant="primary"
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto w-14 h-14 p-0! rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className={cn("w-6 h-6 transition-transform duration-300", isOpen ? "rotate-45" : "rotate-0")} />
      </Button>
    </div>
  );
}
