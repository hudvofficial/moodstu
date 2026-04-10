import React from 'react';
import { cn } from "@/lib/utils";

interface CrmDashboardLayoutProps {
  children: React.ReactNode;
  widgets?: React.ReactNode;
  view?: 'list' | 'board';
  className?: string;
}

export function CrmDashboardLayout({ 
  children, 
  widgets, 
  view = 'list',
  className 
}: CrmDashboardLayoutProps) {
  const isList = view === 'list';
  
  // Board mode: full width, no sidebar
  if (!isList) {
    return (
      <div className={cn("w-full", className)}>
        {children}
      </div>
    );
  }

  // List mode: 2-column layout on desktop, stacked on mobile
  return (
    <div className={cn("w-full flex flex-col lg:flex-row gap-6", className)}>
      {/* Left Column (Main List) — takes remaining space */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
      
      {/* Right Column (Widgets) — stacked bottom on mobile, right sticky on desktop */}
      {widgets && (
        <div className="w-full lg:w-[340px] shrink-0 pt-2 lg:pt-0">
          {/* Mobile vs Desktop: Desktop gets sticky and scroll, mobile flows naturally */}
          <div className="lg:sticky lg:top-20 flex flex-col gap-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto no-scrollbar pb-10 lg:pb-0">
            {widgets}
          </div>
        </div>
      )}
    </div>
  );
}
