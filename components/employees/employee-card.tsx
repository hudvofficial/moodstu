/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Phone } from "lucide-react";
import type { EmployeeListItem, EmployeeRole } from "@/types/employee";
import { EMPLOYEE_STATUS_MAP, ROLE_BADGE_MAP } from "@/types/employee-constants";
import { formatPhone, getInitials } from "@/lib/utils";
import { VARIANT_COLORS, VARIANT_DOT } from "@/lib/variant-colors";

// ═══════════════════════════════════════════
// EmployeeCard — Mobile card (lg:hidden)
// Phase 5: uses shared VARIANT_COLORS from lib/variant-colors.ts
// ═══════════════════════════════════════════

interface Props {
  employee: EmployeeListItem;
}

export default function EmployeeCard({ employee: emp }: Props) {
  const router = useRouter();
  const effectiveStatus = emp.deleted_at ? "inactive" : emp.status;
  const statusInfo = EMPLOYEE_STATUS_MAP[effectiveStatus] || { label: effectiveStatus, variant: "neutral" };
  const roleBadge = ROLE_BADGE_MAP[emp.role as EmployeeRole];

  return (
    <div
      onClick={() => router.push(`/employees/${emp.id}`)}
      className="flex items-center gap-3 p-3 bg-bg-card rounded-xl shadow-xs hover:bg-hover/30 cursor-pointer transition-colors active:scale-[0.99]"
    >
      {/* Avatar */}
      {emp.avatar_url ? (
        <img src={emp.avatar_url} alt={emp.full_name} className="size-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
          {getInitials(emp.full_name)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text truncate">{emp.full_name}</p>
          <span className="text-xs text-text-muted shrink-0">{emp.employee_code}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-secondary">{emp.department}</span>
          {emp.position && (
            <>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-secondary truncate">{emp.position}</span>
            </>
          )}
        </div>
        {/* Phone + Role row */}
        <div className="flex items-center gap-2 mt-0.5">
          {emp.phone && (
            <a
              href={`tel:${emp.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Phone className="w-3 h-3" />
              {formatPhone(emp.phone)}
            </a>
          )}
          {roleBadge && emp.role !== "ctv" && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-tiny font-medium ${VARIANT_COLORS[roleBadge.variant] || VARIANT_COLORS.neutral}`}>
              {roleBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Right: Status + Chevron */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[statusInfo.variant] || VARIANT_COLORS.neutral}`}>
          <span className={`size-1.5 rounded-full ${VARIANT_DOT[statusInfo.variant] || VARIANT_DOT.neutral}`} />
          {statusInfo.label}
        </span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>
    </div>
  );
}

