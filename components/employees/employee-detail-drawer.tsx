/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, RotateCcw, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  getEmployeeById,
} from "@/app/actions/employee-queries";
import {
  restoreEmployee,
  softDeleteEmployee,
} from "@/app/actions/employee-mutations";
import type { BadgeVariant } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  EMPLOYEE_STATUS_MAP,
  ROLE_BADGE_MAP,
  getRoleLabel,
} from "@/types/employee-constants";
import type { EmployeeDetail, EmployeeListItem, EmployeeRole, SalaryInfo } from "@/types/employee";
import { formatDate, formatPhone, formatVnd, getInitials } from "@/lib/utils";
import { invalidateEmployeeAfterWrite, revalidateEmployeeCaches } from "@/lib/cache-invalidation";
import EmployeeFormModal from "./employee-form-modal";
import EmployeeInfoCard from "./employee-info-card";
import EmployeeNotes from "./employee-notes";

interface EmployeeDetailDrawerProps {
  employee: EmployeeListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

function asBadgeVariant(value: string | undefined): BadgeVariant {
  const variants = new Set<BadgeVariant>([
    "success",
    "warning",
    "error",
    "info",
    "neutral",
    "primary",
    "accent",
  ]);
  return variants.has(value as BadgeVariant) ? (value as BadgeVariant) : "neutral";
}

export default function EmployeeDetailDrawer({
  employee,
  isOpen,
  onClose,
  onChanged,
}: EmployeeDetailDrawerProps) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !employee?.id) {
      setDetail(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setDetail(null);
    setLoading(true);

    getEmployeeById(employee.id)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) throw new Error(result.error);
        if (!result.data) throw new Error("Không tải được hồ sơ nhân viên");
        setDetail(result.data);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : "Không tải được hồ sơ nhân viên");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employee?.id, isOpen]);

  const source = detail || employee;
  const isDeleted = !!source?.deleted_at;
  const effectiveStatus = isDeleted ? "inactive" : source?.status || "active";
  const statusInfo = EMPLOYEE_STATUS_MAP[effectiveStatus] || {
    label: effectiveStatus,
    variant: "neutral",
  };
  const role = source?.role as EmployeeRole | undefined;
  const roleBadge = role ? ROLE_BADGE_MAP[role] : null;
  const salary = (detail?.salary_info || {}) as SalaryInfo;

  const refreshDrawer = async () => {
    if (!employee?.id) return;
    const result = await getEmployeeById(employee.id);
    if (result.success && result.data) setDetail(result.data);
  };

  const handleSoftDelete = async () => {
    if (!detail) return;

    setActionLoading(true);
    try {
      const result = await softDeleteEmployee(detail.id);
      if (!result.success) throw new Error(result.error || "Lỗi cho nghỉ việc");
      toast.success("Đã cho nghỉ việc");
      await invalidateEmployeeAfterWrite(detail.id);
      onChanged?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi xử lý");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!detail) return;

    setActionLoading(true);
    try {
      const result = await restoreEmployee(detail.id);
      if (!result.success) throw new Error(result.error || "Lỗi khôi phục");
      toast.success("Đã khôi phục nhân viên");
      await Promise.all([
        refreshDrawer(),
        revalidateEmployeeCaches(detail.id),
      ]);
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi khôi phục");
    } finally {
      setActionLoading(false);
    }
  };

  const titleBadge = (
    <Badge variant={asBadgeVariant(statusInfo.variant)} dot>
      {statusInfo.label}
    </Badge>
  );

  const actionClassName =
    "btn btn-secondary h-9 px-2.5 sm:px-3 gap-1.5 text-xs font-semibold";
  const dangerActionClassName =
    "btn btn-secondary h-9 px-2.5 sm:px-3 gap-1.5 text-xs font-semibold border-error/25 bg-error/5 text-error hover:bg-error/10 hover:border-error/40";

  const headerRight = detail ? (
    <div className="flex items-center gap-2">
      {isDeleted ? (
        <Button
          type="button"
          unstyled
          onClick={handleRestore}
          disabled={actionLoading}
          className={actionClassName}
          title="Khôi phục"
          aria-label="Khôi phục nhân viên"
        >
          {actionLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RotateCcw className="size-4" />
          )}
          <span className="hidden sm:inline">Khôi phục</span>
        </Button>
      ) : (
        <>
          <Button
            type="button"
            unstyled
            onClick={() => setShowForm(true)}
            className={actionClassName}
            title="Sửa nhân viên"
            aria-label="Sửa nhân viên"
          >
            <Pencil className="size-4" />
            <span className="hidden sm:inline">Sửa</span>
          </Button>
          <Button
            type="button"
            unstyled
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={actionLoading}
            className={dangerActionClassName}
            title="Cho nghỉ việc"
            aria-label="Cho nghỉ việc"
          >
            {actionLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserMinus className="size-4" />
            )}
            <span className="hidden sm:inline">Cho nghỉ</span>
          </Button>
        </>
      )}
    </div>
  ) : null;

  const personalItems = detail
    ? [
        { label: "Giới tính", value: detail.gender },
        {
          label: "Số điện thoại",
          value: detail.phone ? formatPhone(detail.phone) : null,
          href: detail.phone ? `tel:${detail.phone}` : undefined,
        },
        {
          label: "Email",
          value: detail.email,
          href: detail.email ? `mailto:${detail.email}` : undefined,
        },
      ]
    : [];

  const workItems = detail
    ? [
        { label: "Phòng ban", value: detail.department },
        { label: "Chức vụ", value: detail.position },
        {
          label: "Vai trò",
          value: getRoleLabel(detail.role as EmployeeRole),
        },
        {
          label: "Ngày bắt đầu",
          value: detail.start_date ? formatDate(detail.start_date) : null,
        },
      ]
    : [];

  const salaryItems = detail
    ? [
        {
          label: "Lương cơ bản",
          value:
            typeof salary.base_salary === "number"
              ? formatVnd(salary.base_salary)
              : null,
        },
        { label: "Ngân hàng", value: salary.bank_name || null },
        { label: "Số tài khoản", value: salary.bank_account_no || null },
        { label: "Tên tài khoản", value: salary.bank_account_name || null },
      ]
    : [];

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={source?.full_name || "Chi tiết nhân viên"}
        titleBadge={source ? titleBadge : undefined}
        headerRight={headerRight}
        size="lg"
      >
        {!source ? null : (
          <div className="space-y-4">
            <section className="card-base p-4">
              <div className="flex items-start gap-4">
                {source.avatar_url ? (
                  <img
                    src={source.avatar_url}
                    alt={source.full_name}
                    className="size-14 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary text-lg font-bold shrink-0">
                    {getInitials(source.full_name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-h3 truncate">{source.full_name}</h3>
                    <span className="text-sm text-text-muted">
                      {source.employee_code}
                    </span>
                  </div>
                  <p className="text-caption mt-1">
                    {source.department}
                    {source.position ? ` · ${source.position}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {roleBadge ? (
                      <Badge variant={asBadgeVariant(roleBadge.variant)}>
                        {roleBadge.label}
                      </Badge>
                    ) : null}
                    <Badge variant={asBadgeVariant(statusInfo.variant)} dot>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </section>

            {loading ? (
              <div className="card-base p-6 flex items-center justify-center gap-2 text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tải hồ sơ...
              </div>
            ) : detail ? (
              <>
                <section className="card-base p-4">
                  <EmployeeInfoCard
                    title="Thông tin cá nhân"
                    items={personalItems}
                    embedded
                  />
                  <div className="h-px bg-border/30 my-4" />
                  <EmployeeInfoCard
                    title="Thông tin công việc"
                    items={workItems}
                    embedded
                  />
                </section>

                <EmployeeInfoCard title="Thông tin lương" items={salaryItems} />
                <EmployeeNotes employeeId={detail.id} initialNotes={detail.notes} />
              </>
            ) : (
              <div className="card-base p-4 text-caption text-text-muted">
                Không tải được dữ liệu chi tiết.
              </div>
            )}
          </div>
        )}
      </Drawer>

      <EmployeeFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          await refreshDrawer();
          await revalidateEmployeeCaches(detail?.id);
          onChanged?.();
        }}
        editEmployee={detail}
      />
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          void handleSoftDelete();
        }}
        title="Cho nhân viên nghỉ việc"
        message={`Nhân viên "${detail?.full_name || ""}" sẽ bị chuyển sang trạng thái nghỉ việc và không còn quyền truy cập hệ thống.`}
        confirmLabel={actionLoading ? "Đang xử lý..." : "Cho nghỉ"}
        variant="danger"
      />
    </>
  );
}
