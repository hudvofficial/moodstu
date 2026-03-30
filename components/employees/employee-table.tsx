/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { EmployeeListItem, EmployeeRole } from "@/types/employee";
import { EMPLOYEE_STATUS_MAP, ROLE_BADGE_MAP } from "@/types/employee-constants";
import { formatPhone, getInitials } from "@/lib/utils";
import { VARIANT_COLORS, VARIANT_DOT } from "@/lib/variant-colors";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";

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
    <TableWrapper>
        <THead>
          <tr>
            <TH>Nhân viên</TH>
            <TH>Mã NV</TH>
            <TH>Phòng ban</TH>
            <TH>Chức vụ</TH>
            <TH>Vai trò</TH>
            <TH>SĐT</TH>
            <TH>Trạng thái</TH>
            <TH className="w-10" />
          </tr>
        </THead>
        <TBody>
          {employees.map((emp) => {
            const effectiveStatus = emp.deleted_at ? "inactive" : emp.status;
            const statusInfo = EMPLOYEE_STATUS_MAP[effectiveStatus] || { label: effectiveStatus, variant: "neutral" };
            const roleBadge = ROLE_BADGE_MAP[emp.role as EmployeeRole];

            return (
              <TR
                key={emp.id}
                onClick={() => router.push(`/employees/${emp.id}`)}
              >
                <TD>
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
                </TD>
                <TD className="text-text-secondary">{emp.employee_code}</TD>
                <TD className="text-text-secondary">{emp.department}</TD>
                <TD className="text-text-secondary">{emp.position || "—"}</TD>
                <TD>
                  {roleBadge ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[roleBadge.variant] || VARIANT_COLORS.neutral}`}>
                      {roleBadge.label}
                    </span>
                  ) : (
                    <span className="text-sm text-text-muted">{emp.role}</span>
                  )}
                </TD>
                <TD>
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
                </TD>
                <TD>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[statusInfo.variant] || VARIANT_COLORS.neutral}`}>
                    <span className={`size-1.5 rounded-full ${VARIANT_DOT[statusInfo.variant] || VARIANT_DOT.neutral}`} />
                    {statusInfo.label}
                  </span>
                </TD>
                <TD className="px-2">
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </TableWrapper>
  );
}

