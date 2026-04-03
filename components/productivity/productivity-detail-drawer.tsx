"use client";

import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import {
  WORKLOAD_BADGE_VARIANTS,
  WORKLOAD_LABELS,
} from "@/types/productivity-constants";
import type { EmployeeJobGroup, EmployeeProductivity } from "@/types/productivity";
import { ProductivityDetailContent } from "./productivity-detail-content";

interface ProductivityDetailDrawerProps {
  isOpen: boolean;
  employee: EmployeeProductivity | null;
  groups: EmployeeJobGroup[];
  canViewCost: boolean;
  today: string;
  isLoading: boolean;
  errorMessage?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export function ProductivityDetailDrawer({
  isOpen,
  employee,
  groups,
  canViewCost,
  today,
  isLoading,
  errorMessage,
  onClose,
  onRetry,
}: ProductivityDetailDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={employee?.full_name || "Chi tiết năng suất"}
      titleBadge={
        employee ? (
          <Badge variant={WORKLOAD_BADGE_VARIANTS[employee.workload_level]}>
            {WORKLOAD_LABELS[employee.workload_level]}
          </Badge>
        ) : undefined
      }
      width="560px"
    >
      <ProductivityDetailContent
        employee={employee}
        groups={groups}
        canViewCost={canViewCost}
        today={today}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={onRetry}
      />
    </Drawer>
  );
}
