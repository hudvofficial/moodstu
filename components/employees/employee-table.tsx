/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { EmployeeListItem, EmployeeRole } from "@/types/employee";
import { EMPLOYEE_STATUS_MAP, ROLE_BADGE_MAP } from "@/types/employee-constants";
import { formatPhone, getInitials } from "@/lib/utils";
import { VARIANT_COLORS, VARIANT_DOT } from "@/lib/variant-colors";

// ═══════════════════════════════════════════
// EmployeeTable — Desktop table (hidden lg:block)
// Phase 5: uses shared VARIANT_COLORS from lib/variant-colors.ts
// ═══════════════════════════════════════════

interface Props {
  employees: EmployeeListItem[];
}

export default function EmployeeTable({ employees }: Props) {
  const router = useRouter();

  return (
    <div className="bg-bg-card rounded-xl shadow-xs overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-surface/50">
            <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Nhân viên</th>
            <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Mã NV</th>
            <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Phòng ban</th>
            <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Chức vụ</th>
            <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Vai trò</th>
            <th className="text-left text-xs font-medium text-text-muted px-4 py-3">SĐT</th>
            <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Trạng thái</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const effectiveStatus = emp.deleted_at ? "inactive" : emp.status;
            const statusInfo = EMPLOYEE_STATUS_MAP[effectiveStatus] || { label: effectiveStatus, variant: "neutral" };
            const roleBadge = ROLE_BADGE_MAP[emp.role as EmployeeRole];

            return (
              <tr
                key={emp.id}
                onClick={() => router.push(`/employees/${emp.id}`)}
                className="even:bg-surface/30 hover:bg-primary/5 active:bg-primary/10 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.full_name} className="size-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(emp.full_name)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-text">{emp.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{emp.employee_code}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{emp.department}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{emp.position || "—"}</td>
                <td className="px-4 py-3">
                  {roleBadge ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[roleBadge.variant] || VARIANT_COLORS.neutral}`}>
                      {roleBadge.label}
                    </span>
                  ) : (
                    <span className="text-sm text-text-muted">{emp.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {emp.phone ? (
                    <a
                      href={`tel:${emp.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-primary hover:underline"
                    >
                      {formatPhone(emp.phone)}
                    </a>
                  ) : (
                    <span className="text-sm text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[statusInfo.variant] || VARIANT_COLORS.neutral}`}>
                    <span className={`size-1.5 rounded-full ${VARIANT_DOT[statusInfo.variant] || VARIANT_DOT.neutral}`} />
                    {statusInfo.label}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

