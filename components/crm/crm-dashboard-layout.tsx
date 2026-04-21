import React from "react";
import { cn } from "@/lib/utils";

interface CrmDashboardLayoutProps {
  children: React.ReactNode;
  widgets?: React.ReactNode;
  view?: "list" | "board";
  className?: string;
}

export function CrmDashboardLayout({
  children,
  widgets,
  view = "list",
  className,
}: CrmDashboardLayoutProps) {
  const isList = view === "list";

  if (!isList) {
    return <div className={cn("w-full min-w-0", className)}>{children}</div>;
  }

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 lg:flex-row", className)}>
      <div className="min-w-0 flex-1">{children}</div>

      {widgets ? (
        <div className="w-full min-w-0 shrink-0 pt-2 lg:w-[340px] lg:pt-0">
          <div className="no-scrollbar flex flex-col gap-4 pb-10 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-0">
            {widgets}
          </div>
        </div>
      ) : null}
    </div>
  );
}
