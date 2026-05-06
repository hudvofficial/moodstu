"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, UserX, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { EmployeeDetail, EmployeeRole, SalaryInfo } from "@/types/employee";
import { ROLE_BADGE_MAP, EMPLOYEE_STATUS_MAP, getRoleLabel } from "@/types/employee-constants";
import { formatDate, formatPhone, formatVnd, getInitials } from "@/lib/utils";
import { invalidateEmployeeAfterWrite, revalidateEmployeeCaches } from "@/lib/cache-invalidation";
import { useRealtime } from "@/hooks/use-realtime";
import { getEmployeeById } from "@/app/actions/employee-queries";
import { softDeleteEmployee, restoreEmployee } from "@/app/actions/employee-mutations";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import EmployeeInfoCard from "./employee-info-card";
import EmployeeNotes from "./employee-notes";
import EmployeeFormModal from "./employee-form-modal";

// ═══════════════════════════════════════════
// EmployeeDetailPage — Detail + Edit + Soft Delete
// Phase 5: consolidated utils from SSOT lib/utils.ts
// ═══════════════════════════════════════════


export default function EmployeeDetailPage({ employee: initialEmployee }: { employee: EmployeeDetail }) {
  const router = useRouter();
  const [employee, setEmployee] = useState(initialEmployee);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setEmployee(initialEmployee);
  }, [initialEmployee]);

  const refreshEmployee = useCallback(async () => {
    const result = await getEmployeeById(employee.id);
    if (result.success && result.data) {
      setEmployee(result.data as EmployeeDetail);
    }
    await revalidateEmployeeCaches(employee.id);
  }, [employee.id]);

  useRealtime("employees", {
    filter: `id=eq.${employee.id}`,
    onChange: refreshEmployee,
    debounceMs: 500,
  });

  const isDeleted = !!employee.deleted_at;
  const effectiveStatus = isDeleted ? "inactive" : employee.status;
  const statusInfo = EMPLOYEE_STATUS_MAP[effectiveStatus] || { label: effectiveStatus, variant: "neutral" };
  const roleBadge = ROLE_BADGE_MAP[employee.role as EmployeeRole];
  const salary = (employee.salary_info || {}) as SalaryInfo;

  const personalItems = [
    { label: "Giới tính", value: employee.gender },
    { label: "Số điện thoại", value: employee.phone ? formatPhone(employee.phone) : null, href: employee.phone ? `tel:${employee.phone}` : undefined },
    { label: "Email", value: employee.email, href: employee.email ? `mailto:${employee.email}` : undefined },
  ];

  const workItems = [
    { label: "Phòng ban", value: employee.department },
    { label: "Chức vụ", value: employee.position },
    { label: "Vai trò", value: getRoleLabel(employee.role as EmployeeRole) },
    { label: "Ngày bắt đầu", value: employee.start_date ? formatDate(employee.start_date) : "—" },
  ];

  const salaryItems = [
    { label: "Lương cơ bản", value: salary.base_salary ? formatVnd(salary.base_salary) : null },
    { label: "Ngân hàng", value: salary.bank_name || null },
    { label: "Số tài khoản", value: salary.bank_account_no || null },
    { label: "Tên tài khoản", value: salary.bank_account_name || null },
  ];

  const handleSoftDelete = async () => {
    setActionLoading(true);
    try {
      const result = await softDeleteEmployee(employee.id);
      if (result.success) {
        toast.success("Đã cho nghỉ việc");
        await invalidateEmployeeAfterWrite(employee.id);
        router.push("/employees");
      } else { throw new Error(result.error || "Lỗi"); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi xử lý");
    } finally { setActionLoading(false); }
  };

  const handleRestore = async () => {
    setActionLoading(true);
    try {
      const result = await restoreEmployee(employee.id);
      if (result.success) {
        toast.success("Đã khôi phục nhân viên");
        void refreshEmployee();
      } else { throw new Error(result.error || "Lỗi"); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khôi phục");
    } finally { setActionLoading(false); }
  };

  return (
    <div className="main-container gap-4!">
      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: "Nhân viên", href: "/employees" },
        { label: employee.full_name },
      ]} />

      {/* ── Header ── */}
      <div className="card-base flex items-start gap-4 py-4 px-5">
        {employee.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={employee.avatar_url} alt={employee.full_name} className="size-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary text-xl font-bold shrink-0">
            {getInitials(employee.full_name)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-h3 text-text">{employee.full_name}</h1>
            <span className="text-sm text-text-muted">{employee.employee_code}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {roleBadge && (
              <Badge variant={roleBadge.variant as "primary" | "success" | "warning" | "error" | "info" | "neutral" | "accent"}>
                {roleBadge.label}
              </Badge>
            )}
            <Badge variant={statusInfo.variant as "primary" | "success" | "warning" | "error" | "info" | "neutral" | "accent"} dot>
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isDeleted ? (
            <Button unstyled onClick={handleRestore} disabled={actionLoading} className="btn btn-secondary gap-1.5">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span className="hidden sm:inline">Khôi phục</span>
            </Button>
          ) : (
            <>
              <Button unstyled onClick={() => setShowForm(true)} className="btn btn-secondary gap-1.5">
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Sửa</span>
              </Button>
              <Button unstyled onClick={() => setConfirmDeleteOpen(true)} disabled={actionLoading} className="btn btn-secondary gap-1.5 text-error">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                <span className="hidden sm:inline">Cho nghỉ</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Desktop Layout ── */}
      <div className="max-lg:hidden">
        <div className="detail-grid">
          <div className="detail-main">
            <div className="card-base p-5">
              <EmployeeInfoCard title="Thông tin cá nhân" items={personalItems} embedded />
              <div className="h-px bg-border/30 my-4" />
              <EmployeeInfoCard title="Thông tin công việc" items={workItems} embedded />
            </div>
          </div>
          <div className="detail-sidebar">
            <EmployeeInfoCard title="Thông tin lương" items={salaryItems} />
            <EmployeeNotes employeeId={employee.id} initialNotes={employee.notes} />
          </div>
        </div>
      </div>

      {/* ── Mobile Layout ── */}
      <div className="lg:hidden flex flex-col gap-3">
        <div className="card-base p-4">
          <EmployeeInfoCard title="Cá nhân" items={personalItems} embedded />
          <div className="h-px bg-border/30 my-3" />
          <EmployeeInfoCard title="Công việc" items={workItems} embedded />
          <div className="h-px bg-border/30 my-3" />
          <EmployeeInfoCard title="Lương" items={salaryItems} embedded />
        </div>
        <EmployeeNotes employeeId={employee.id} initialNotes={employee.notes} />
      </div>

      {/* ── Form Modal ── */}
      <EmployeeFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={refreshEmployee}
        editEmployee={employee}
      />
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          void handleSoftDelete();
        }}
        title="Cho nhân viên nghỉ việc"
        message={`Nhân viên "${employee.full_name}" sẽ bị chuyển sang trạng thái nghỉ việc và không còn quyền truy cập hệ thống.`}
        confirmLabel={actionLoading ? "Đang xử lý..." : "Cho nghỉ"}
        variant="danger"
      />
    </div>
  );
}
