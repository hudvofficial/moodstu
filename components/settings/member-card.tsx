"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AlertCircle, Link2, Shield, Unlink } from "lucide-react";
import {
  updateUserRole,
  unlinkUserFromEmployee,
} from "@/app/actions/user-management";
import type { AuthUserWithEmployee } from "@/app/actions/user-management";
import type { EmployeeRole } from "@/types/employee";
import { ROLE_LABELS } from "@/types/employee-constants";
import { SelectForm } from "@/components/ui/select/SelectForm";
import LinkEmployeeModal from "./link-employee-modal";

const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "manager", label: ROLE_LABELS.manager },
  { value: "sale", label: ROLE_LABELS.sale },
  { value: "media", label: ROLE_LABELS.media },
  { value: "ctv", label: ROLE_LABELS.ctv },
];

interface MemberCardProps {
  user: AuthUserWithEmployee;
  isCurrentUser: boolean;
  onRefresh: () => void;
}

export default function MemberCard({
  user,
  isCurrentUser,
  onRefresh,
}: MemberCardProps) {
  const [isPending, startTransition] = useTransition();
  const [linkOpen, setLinkOpen] = useState(false);
  const linked = user.linked_employee;
  const displayName = linked?.full_name || user.email;
  const avatarUrl = linked?.avatar_url;
  const initials = displayName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const selectedRole = user.jwt_role || linked?.role || "ctv";

  const handleRoleChange = (newRole: string) => {
    const nextRole = newRole as EmployeeRole;
    if (nextRole === selectedRole || isCurrentUser) return;

    startTransition(async () => {
      const result = await updateUserRole(user.auth_id, nextRole);
      if (result.success) {
        toast.success(result.data.message);
        onRefresh();
      } else {
        toast.error(result.error || "Lỗi cập nhật quyền");
      }
    });
  };

  const handleUnlink = () => {
    if (!linked) return;
    startTransition(async () => {
      const result = await unlinkUserFromEmployee(user.auth_id);
      if (result.success) {
        toast.success(result.data.message);
        onRefresh();
      } else {
        toast.error(result.error || "Lỗi hủy liên kết");
      }
    });
  };

  return (
    <>
      <div
        className={`rounded-lg p-3 transition-colors ${
          isCurrentUser ? "bg-primary/5 ring-1 ring-primary/20" : "bg-bg-card"
        } ${isPending ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover shrink-0"
              unoptimized={true}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary truncate">
                {displayName}
              </p>
              {isCurrentUser && (
                <span className="text-tiny text-primary font-bold">(Bạn)</span>
              )}
            </div>
            <p className="text-xs text-text-muted truncate">{user.email}</p>

            {linked ? (
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-text-muted shrink-0" />
                <span className="text-tiny text-text-muted">
                  {ROLE_LABELS[linked.role]} · {linked.status}
                </span>
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-warning shrink-0" />
                  <span className="text-tiny text-warning">
                    Chưa liên kết hồ sơ nhân viên
                  </span>
                </div>
                {user.suggested_employee && (
                  <p className="text-tiny text-text-muted">
                    Có gợi ý liên kết theo email:{" "}
                    <span className="font-medium text-text-secondary">
                      {user.suggested_employee.full_name}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-32 shrink-0">
              <SelectForm
                value={selectedRole}
                onChange={handleRoleChange}
                disabled={isCurrentUser || isPending}
                options={ROLE_OPTIONS}
                className="[&_button]:min-h-[unset]! [&_button]:py-1! [&_button]:text-xs! [&_button]:font-medium [&_button]:bg-transparent"
              />
            </div>

            {linked ? (
              /* eslint-disable-next-line react/forbid-elements -- compact icon action */
              <button
                onClick={handleUnlink}
                disabled={isPending || isCurrentUser}
                className="icon-btn w-8! h-8! hover:bg-red-50! hover:text-red-500!"
                title="Hủy liên kết"
                aria-label={`Hủy liên kết ${linked.full_name}`}
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            ) : (
              /* eslint-disable-next-line react/forbid-elements -- compact icon action */
              <button
                onClick={() => setLinkOpen(true)}
                disabled={isPending}
                className="icon-btn w-8! h-8! hover:bg-primary/10! hover:text-primary!"
                title="Liên kết nhân viên"
                aria-label={`Liên kết ${user.email} với nhân viên`}
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <LinkEmployeeModal
        isOpen={linkOpen}
        onClose={() => setLinkOpen(false)}
        authUserId={user.auth_id}
        authEmail={user.email}
        suggestedEmployee={user.suggested_employee}
        onLinked={onRefresh}
      />
    </>
  );
}
