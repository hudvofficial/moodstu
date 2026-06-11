"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { UnifiedModal } from "@/components/ui/unified-modal";
import DatePicker from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEmployee, updateEmployee } from "@/app/actions/employee-mutations";
import type { EmployeeDetail, EmployeeRole } from "@/types/employee";
import { DEPARTMENT_OPTIONS, ROLE_LABELS, GENDER_OPTIONS } from "@/types/employee-constants";
import { DEFAULT_FORM_DATA, type EmployeeFormData } from "@/types/employee-form";

// ═══════════════════════════════════════════
// EmployeeFormModal — Create / Edit employee
// Uses UnifiedModal + DatePicker (existing components)
// ═══════════════════════════════════════════

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editEmployee?: EmployeeDetail | null;
}

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

function employeeToForm(emp: EmployeeDetail): EmployeeFormData {
  return {
    full_name: emp.full_name || "",
    gender: emp.gender || "nam",
    phone: emp.phone || "",
    email: emp.email || "",
    department: emp.department || "",
    position: emp.position || "",
    role: (emp.role as EmployeeRole) || "ctv",
    start_date: emp.start_date || "",
    base_salary: emp.salary_info?.base_salary?.toString() || "",
    bank_name: emp.salary_info?.bank_name || "",
    bank_account_no: emp.salary_info?.bank_account_no || "",
    bank_account_name: emp.salary_info?.bank_account_name || "",
  };
}

export default function EmployeeFormModal({ isOpen, onClose, onSaved, editEmployee }: Props) {
  const isEdit = !!editEmployee;
  const [form, setForm] = useState<EmployeeFormData>(DEFAULT_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(editEmployee ? employeeToForm(editEmployee) : DEFAULT_FORM_DATA);
      setShowSalary(false);
    }
  }, [isOpen, editEmployee]);

  const setField = (key: keyof EmployeeFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // Validate fields
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Vui lòng nhập tên nhân viên";
    if (!form.department) errs.department = "Vui lòng chọn phòng ban";
    if (form.phone && !/^[0-9]{10,11}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "SĐT phải 10-11 số";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email không hợp lệ";
    if (form.base_salary && Number(form.base_salary) <= 0) errs.base_salary = "Lương phải > 0";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErr = Object.values(errs)[0];
      toast.error(firstErr);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      // Build payload
      const payload: Record<string, string | number | object | null> = {
        full_name: form.full_name.trim(),
        gender: form.gender,
        phone: form.phone || null,
        email: form.email || null,
        department: form.department,
        position: form.position || null,
        role: form.role,
        start_date: form.start_date || null,
      };

      // Salary → salary_info JSONB
      if (form.base_salary || form.bank_name || form.bank_account_no || form.bank_account_name) {
        payload.salary_info = {
          ...(form.base_salary ? { base_salary: Number(form.base_salary) } : {}),
          ...(form.bank_name ? { bank_name: form.bank_name } : {}),
          ...(form.bank_account_no ? { bank_account_no: form.bank_account_no } : {}),
          ...(form.bank_account_name ? { bank_account_name: form.bank_account_name } : {}),
        };
      }

      // Instant close — đóng modal ngay, chạy server action ngầm
      onClose();

      const toastId = toast.loading(isEdit ? "Đang cập nhật..." : "Đang thêm nhân viên...");

      const result = isEdit
        ? await updateEmployee(editEmployee!.id, payload, editEmployee!.updated_at)
        : await createEmployee(payload);

      if (result.success) {
        toast.success(isEdit ? "Đã cập nhật nhân viên" : "Đã thêm nhân viên", { id: toastId });
        onSaved();
      } else {
        toast.error(result.error || "Lỗi lưu nhân viên", { id: toastId });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu nhân viên");
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
        Hủy
      </Button>
      <Button type="button" onClick={handleSubmit} className="gap-1.5" disabled={submitting}>
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {isEdit ? "Cập nhật" : "Thêm"}
      </Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Sửa nhân viên" : "Thêm nhân viên"}
      footer={footer}
      size="xl"
    >
      <div className="space-y-5">
        {/* ── Section 1: Thông tin cá nhân ── */}
        <div>
          <h4 className="section-heading mb-3">Thông tin cá nhân</h4>
          <div className="form-grid-2col">
            <div>
              <label className="label-base">Họ tên <span className="text-error">*</span></label>
              <Input className="w-full" value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} placeholder="Nguyễn Văn A" disabled={submitting} />
            </div>
            <SelectForm
              label="Giới tính"
              value={form.gender}
              onChange={(v) => setField("gender", v)}
              options={[...GENDER_OPTIONS]}
              disabled={submitting}
            />
            <div>
              <label className="label-base">Số điện thoại</label>
              <Input className="w-full" value={form.phone} onChange={(e) => { setField("phone", e.target.value); setErrors((p) => ({ ...p, phone: "" })); }} placeholder="0912 345 678" disabled={submitting} />
              {errors.phone && <p className="error-text">{errors.phone}</p>}
            </div>
            <div>
              <label className="label-base">Email</label>
              <Input className="w-full" type="email" value={form.email} onChange={(e) => { setField("email", e.target.value); setErrors((p) => ({ ...p, email: "" })); }} placeholder="email@example.com" disabled={submitting} />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>
          </div>
        </div>

        {/* ── Section 2: Thông tin công việc ── */}
        <div>
          <h4 className="section-heading mb-3">Thông tin công việc</h4>
          <div className="form-grid-2col">
            <SelectForm
              label="Phòng ban *"
              value={form.department}
              onChange={(v) => setField("department", v)}
              options={[...DEPARTMENT_OPTIONS]}
              placeholder="Chọn phòng ban"
              error={errors.department}
              disabled={submitting}
            />
            <div>
              <label className="label-base">Chức vụ</label>
              <Input className="w-full" value={form.position} onChange={(e) => setField("position", e.target.value)} placeholder="Photographer" disabled={submitting} />
            </div>
            <SelectForm
              label="Vai trò"
              value={form.role}
              onChange={(v) => setField("role", v as EmployeeRole)}
              options={ROLE_OPTIONS}
              disabled={submitting}
            />
            <DatePicker label="Ngày bắt đầu" value={form.start_date} onChange={(date) => setField("start_date", date)} disabled={submitting} />
          </div>
        </div>

        {/* ── Section 3: Thông tin lương (collapsible) ── */}
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowSalary(!showSalary)} className="flex items-center gap-2 section-heading hover:text-primary transition-colors !p-0 hover:bg-transparent">
            <ChevronDown className={`w-4 h-4 transition-transform ${showSalary ? "rotate-180" : ""}`} />
            Thông tin lương
          </Button>
          {showSalary && (
            <div className="form-grid-2col mt-3">
              <div>
                <label className="label-base">Lương cơ bản</label>
                <Input className="w-full" type="number" min="0" value={form.base_salary} onChange={(e) => { setField("base_salary", e.target.value); setErrors((p) => ({ ...p, base_salary: "" })); }} placeholder="10000000" disabled={submitting} />
                {errors.base_salary && <p className="error-text">{errors.base_salary}</p>}
              </div>
              <div>
                <label className="label-base">Ngân hàng</label>
                <Input className="w-full" value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} placeholder="Vietcombank" disabled={submitting} />
              </div>
              <div>
                <label className="label-base">Số tài khoản</label>
                <Input className="w-full" value={form.bank_account_no} onChange={(e) => setField("bank_account_no", e.target.value)} placeholder="1234567890" disabled={submitting} />
              </div>
              <div>
                <label className="label-base">Tên tài khoản</label>
                <Input className="w-full" value={form.bank_account_name} onChange={(e) => setField("bank_account_name", e.target.value)} placeholder="NGUYEN VAN A" disabled={submitting} />
              </div>
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}
