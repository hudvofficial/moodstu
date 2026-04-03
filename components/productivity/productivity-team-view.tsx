"use client";

import { FilterX, Users } from "lucide-react";
import { ProductivityMobileCards } from "@/components/productivity/productivity-mobile-cards";
import { ProductivityOverloadBanner } from "@/components/productivity/productivity-overload-banner";
import { ProductivityTeamTable } from "@/components/productivity/productivity-team-table";
import { EmptyState } from "@/components/ui/ux-states";
import type {
  EmployeeProductivity,
  ProductivitySortDirection,
  ProductivitySortKey,
} from "@/types/productivity";

interface ProductivityTeamViewProps {
  employees: EmployeeProductivity[];
  allEmployees: EmployeeProductivity[];
  canViewCost: boolean;
  hasSearch: boolean;
  sortKey: ProductivitySortKey;
  sortDirection: ProductivitySortDirection;
  onSortChange: (
    key: Extract<
      ProductivitySortKey,
      "active_tasks" | "completed_tasks" | "overdue_tasks" | "total_cost"
    >,
  ) => void;
  onSelectEmployee: (employee: EmployeeProductivity) => void;
}

export function ProductivityTeamView({
  employees,
  allEmployees,
  canViewCost,
  hasSearch,
  sortKey,
  sortDirection,
  onSortChange,
  onSelectEmployee,
}: ProductivityTeamViewProps) {
  return (
    <>
      <ProductivityOverloadBanner
        employees={allEmployees}
        onOpenEmployee={onSelectEmployee}
      />

      {employees.length === 0 ? (
        hasSearch ? (
          <EmptyState
            icon={FilterX}
            title="Không tìm thấy nhân sự phù hợp"
            description="Thử thay đổi từ khóa tìm kiếm để xem dữ liệu năng suất."
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Chưa có dữ liệu năng suất"
            description="Module này chưa có dữ liệu năng suất trong kỳ đang chọn."
          />
        )
      ) : (
        <>
          <div className="hidden lg:block">
            <ProductivityTeamTable
              employees={employees}
              canViewCost={canViewCost}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
              onSelectEmployee={onSelectEmployee}
            />
          </div>
          <div className="lg:hidden">
            <ProductivityMobileCards
              employees={employees}
              canViewCost={canViewCost}
              onSelectEmployee={onSelectEmployee}
            />
          </div>
        </>
      )}
    </>
  );
}
