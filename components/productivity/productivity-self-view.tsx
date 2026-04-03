"use client";

import { ProductivityDetailContent } from "@/components/productivity/productivity-detail-content";
import type {
  EmployeeJobGroup,
  EmployeeProductivity,
} from "@/types/productivity";

interface ProductivitySelfViewProps {
  employee: EmployeeProductivity | null;
  groups: EmployeeJobGroup[];
  today: string;
  isLoading: boolean;
  errorMessage: string | undefined;
  onRetry: () => void;
}

export function ProductivitySelfView({
  employee,
  groups,
  today,
  isLoading,
  errorMessage,
  onRetry,
}: ProductivitySelfViewProps) {
  return (
    <>
      {employee &&
        (employee.workload_level === "high" ||
          employee.workload_level === "overloaded") && (
          <div className="card-base bg-warning/5 px-4 py-4 shadow-xs">
            <p className="font-semibold text-dark">
              Năng suất cá nhân đang ở mức{" "}
              {employee.workload_level === "overloaded" ? "quá tải" : "cao"}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Ưu tiên xử lý các task quá hạn và báo quản lý nếu cần phân bổ
              lại công việc.
            </p>
          </div>
        )}

      <ProductivityDetailContent
        employee={employee}
        groups={groups}
        canViewCost={false}
        today={today}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={onRetry}
        emptyTitle="Chưa có công việc trong kỳ"
        emptyDescription="Kỳ đang chọn chưa ghi nhận job nào của bạn."
      />
    </>
  );
}
