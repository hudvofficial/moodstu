"use client";

import { useState, useTransition } from "react";
import {
  updateUserRole,
  unlinkUserFromEmployee,
} from "@/app/actions/user-management";
import type { AuthUserWithEmployee } from "@/app/actions/user-management";
import { SelectForm } from "@/components/ui/select/SelectForm";
import Image from "next/image";
import LinkEmployeeModal from "./link-employee-modal";
import { toast } from "sonner";
import {
  Shield,
  UserCog,
  User,
  Link2,
  Unlink,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Member Card — Single auth user management
   V1 logic 100% + SSOT tokens + lucide icons
   ═══════════════════════════════════════════ */

const ROLES = [
  { value: "Admin", label: "Admin", icon: Shield },
  { value: "Manager", label: "Manager", icon: UserCog },
  { value: "User", label: "User", icon: User },
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

  // ─── Avatar ───
  const linked = user.linked_employee;
  const displayName = linked?.full_name || user.email;
  const avatarUrl = linked?.avatar_url;
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ─── Role change (V1 logic + V2 actions) ───
  const handleRoleChange = (newRole: string) => {
    if (newRole === user.jwt_role || isCurrentUser) return;
    startTransition(async () => {
      const result = await updateUserRole(user.auth_id, newRole);
      if (result.success) {
        toast.success(result.data.message);
        onRefresh();
      } else {
        toast.error(result.error || "Lỗi cập nhật quyền");
      }
    });
  };

  // ─── Unlink (V1 logic + V2 actions) ───
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
          {/* Avatar */}
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
              <span className="text-xs font-bold text-primary">
                {initials}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-primary truncate">
                {displayName}
              </p>
              {isCurrentUser && (
                <span className="text-tiny text-primary font-bold">
                  (Bạn)
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
            {linked && (
              <div className="flex items-center gap-1 mt-0.5">
                <Link2 className="w-3 h-3 text-text-muted shrink-0" />
                <span className="text-tiny text-text-muted">
                  {linked.role} · {linked.status}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Role selector */}
            <div className="relative w-28 shrink-0">
              <SelectForm
                value={user.jwt_role || "User"}
                onChange={(val) => handleRoleChange(val)}
                disabled={isCurrentUser || isPending}
                options={ROLES.map((r) => ({ label: r.label, value: r.value }))}
                className="[&_button]:min-h-[unset]! [&_button]:py-1! [&_button]:text-xs! [&_button]:font-medium [&_button]:bg-transparent"
              />
            </div>

            {/* Link/Unlink button */}
            {linked ? (
              /* eslint-disable-next-line react/forbid-elements -- compact icon-only action */
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
              /* eslint-disable-next-line react/forbid-elements -- compact icon-only action */
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

      {/* Link Employee Modal */}
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
