"use client";

import { Pencil } from "lucide-react";
import type { EmployeeProfile } from "@/types/settings";
import Image from "next/image";

/* ═══════════════════════════════════════════
   Profile Card — Avatar + Name + Role + Edit
   SSOT: card-base, badge, lucide icons
   ═══════════════════════════════════════════ */

interface ProfileCardProps {
  employee: EmployeeProfile;
  onEdit: () => void;
}

export default function ProfileCard({ employee, onEdit }: ProfileCardProps) {
  // Avatar fallback: initials from full_name
  const initials = employee.full_name
    ? employee.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <section className="card-base p-4 lg:p-6">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {employee.avatar_url ? (
          <Image
            src={employee.avatar_url}
            alt={employee.full_name}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover shrink-0"
            unoptimized={true}
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">{initials}</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-text-primary truncate">
            {employee.full_name}
          </h2>
          <p className="text-sm text-text-secondary truncate">
            {employee.email || "Chưa có email"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {employee.role && (
              <span className="badge badge-primary">{employee.role}</span>
            )}
            {employee.department && (
              <span className="text-xs text-text-muted">
                {employee.department}
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        {/* eslint-disable-next-line react/forbid-elements -- icon-only action, no Button wrapper needed */}
        <button
          onClick={onEdit}
          className="icon-btn shrink-0"
          title="Chỉnh sửa hồ sơ"
          aria-label="Chỉnh sửa hồ sơ"
        >
          <Pencil className="w-4.5 h-4.5" />
        </button>
      </div>
    </section>
  );
}
