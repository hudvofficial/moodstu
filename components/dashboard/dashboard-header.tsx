import { memo } from "react";

interface DashboardHeaderProps {
  periodLabel: string;
}

export const DashboardHeader = memo(function DashboardHeader({ periodLabel }: DashboardHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 entrance entrance-1">
      <h1 className="text-h2 font-semibold">
        Tổng quan
      </h1>
      <div className="shrink-0 text-right">
        <p className="text-caption font-medium text-text-secondary">
          {periodLabel}
        </p>
      </div>
    </div>
  );
});
