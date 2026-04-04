"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmployeeProductivity } from "@/types/productivity";

interface ProductivityOverloadBannerProps {
  employees: EmployeeProductivity[];
  onOpenEmployee: (employee: EmployeeProductivity) => void;
}

export function ProductivityOverloadBanner({
  employees,
  onOpenEmployee,
}: ProductivityOverloadBannerProps) {
  const overloadedEmployees = employees.filter(
    (employee) => employee.workload_level === "overloaded",
  );

  if (overloadedEmployees.length === 0) return null;

  const firstEmployee = overloadedEmployees[0];
  const previewNames = overloadedEmployees
    .slice(0, 3)
    .map((employee) => employee.full_name)
    .join(", ");

  return (
    <div className="card-base bg-error/5 px-4 py-4 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-error/10 p-2 text-error">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-body-sm font-bold text-error">
              Có {overloadedEmployees.length} nhân sự đang quá tải
            </p>
            <p className="text-body-sm text-text-secondary">
              {previewNames}
              {overloadedEmployees.length > 3
                ? ` và ${overloadedEmployees.length - 3} người khác`
                : ""}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="danger"
          size="sm"
          className="self-start lg:self-auto"
          onClick={() => onOpenEmployee(firstEmployee)}
        >
          Xem chi tiết
        </Button>
      </div>
    </div>
  );
}
