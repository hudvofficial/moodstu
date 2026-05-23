"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContractFormData } from "@/types/contract-form";
import { SERVICE_TYPE_GROUPS, SERVICE_TYPE_LABELS, workDateLabel, showWeddingDate } from "@/types/contract-form";
import type { ServiceType } from "@/types/contract";
import type { ActiveEmployee } from "@/types/employee";
import { getActiveEmployees } from "@/app/actions/employee-queries";
import DatePicker from "@/components/ui/date-picker";
import { GroupedSelect } from "@/components/ui/grouped-select";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { Fingerprint, X, Plus } from "lucide-react";

// ═══════════════════════════════════════════
// ContractInfoSection — Top fields of the contract form
// Service type, dates, transaction type, assigned_to
// ═══════════════════════════════════════════

const TRANSACTION_TYPES = [
  { value: "hop_dong", label: "Hợp đồng" },
  { value: "hoa_don", label: "Hóa đơn" },
];

// Transform SERVICE_TYPE_GROUPS → GroupedSelect format (computed once)
const SERVICE_TYPE_SELECT_GROUPS = SERVICE_TYPE_GROUPS.map((group) => ({
  groupName: group.groupName,
  color: group.color,
  options: group.types.map((type) => ({
    value: type,
    label: SERVICE_TYPE_LABELS[type],
  })),
}));

const UNASSIGNED_EMPLOYEE_VALUE = "__unassigned__";

interface Props {
  formData: ContractFormData;
  updateField: <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => void;
  weddingDate: string;
  onWeddingDateChange: (date: string) => void;
  badgeCode?: string;
}

export function ContractInfoSection({ formData, updateField, weddingDate, onWeddingDateChange, badgeCode }: Props) {
  const [employees, setEmployees] = useState<ActiveEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [employeeError, setEmployeeError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      setIsLoadingEmployees(true);
      setEmployeeError("");
      try {
        const result = await getActiveEmployees();
        if (cancelled) return;
        if (result.success) {
          setEmployees(result.data);
        } else {
          setEmployees([]);
          setEmployeeError(result.error);
        }
      } catch (error) {
        if (!cancelled) {
          setEmployees([]);
          setEmployeeError(error instanceof Error ? error.message : "Lỗi tải nhân viên");
        }
      } finally {
        if (!cancelled) setIsLoadingEmployees(false);
      }
    }

    loadEmployees();
    return () => {
      cancelled = true;
    };
  }, []);

  const employeeOptions = useMemo(
    () => {
      const hasSelectedEmployee = employees.some((employee) => employee.id === formData.assigned_to);
      return [
        { value: UNASSIGNED_EMPLOYEE_VALUE, label: "Chưa phân công" },
        ...(formData.assigned_to && !hasSelectedEmployee
          ? [{ value: formData.assigned_to, label: "Nhân viên đã lưu" }]
          : []),
        ...employees.map((employee) => ({
          value: employee.id,
          label: [
            employee.full_name,
            employee.position || employee.department,
          ].filter(Boolean).join(" · "),
        })),
      ];
    },
    [employees, formData.assigned_to],
  );

  const workDates = useMemo(() => {
    const dates = formData.work_date ? formData.work_date.split(',').map(d => d.trim()).filter(Boolean) : [];
    return dates.length > 0 ? dates : [""];
  }, [formData.work_date]);

  const weddingDatesArr = useMemo(() => {
    const dates = weddingDate ? weddingDate.split(',').map(d => d.trim()).filter(Boolean) : [];
    return dates.length > 0 ? dates : [""];
  }, [weddingDate]);

  return (
    <section className="card-base border-l-4 border-accent p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="form-section-heading">
          1. Thông tin hợp đồng
        </h3>
        {badgeCode && (
          <div className="flex items-center gap-1.5 text-interactive text-caption">
            <span className="text-text-muted">Mã HĐ</span>
            <Fingerprint className="h-3.5 w-3.5" />
            <span className="font-bold tracking-wider">{badgeCode}</span>
          </div>
        )}
      </div>

      {/* All fields: 2 cols mobile, 3 cols desktop */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SimpleSelect
          label="Loại giao dịch"
          value={formData.transaction_type}
          onChange={(v) => updateField("transaction_type", v as "hop_dong" | "hoa_don")}
          options={TRANSACTION_TYPES}
        />

        <GroupedSelect
          value={formData.service_type}
          onChange={(val) => updateField("service_type", val as ServiceType)}
          groups={SERVICE_TYPE_SELECT_GROUPS}
          label="Loại dịch vụ *"
        />

        <DatePicker
          value={formData.contract_date}
          onChange={(v) => updateField("contract_date", v)}
          label="Ngày tạo hợp đồng"
          placeholder="Chọn ngày"
        />

        <div className="space-y-1">
          <label className="label-base">{workDateLabel(formData.service_type)}</label>
          {workDates.map((date, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div className="flex-1">
                <DatePicker
                  value={date}
                  onChange={(v) => {
                    const newDates = [...workDates];
                    newDates[idx] = v;
                    updateField("work_date", newDates.filter(Boolean).join(','));
                  }}
                  placeholder="Chọn ngày"
                />
              </div>
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const newDates = workDates.filter((_, i) => i !== idx);
                    updateField("work_date", newDates.filter(Boolean).join(','));
                  }}
                  className="p-1 text-text-muted hover:text-error transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateField("work_date", [...workDates, ""].filter(Boolean).join(','))}
            className="flex items-center gap-1 text-xs font-medium text-interactive hover:text-interactive-hover mt-1"
          >
            <Plus size={12} /> Thêm ngày
          </button>
        </div>

        {showWeddingDate(formData.service_type) && formData.service_type !== "ngay_cuoi" && (
          <div className="space-y-1">
            <label className="label-base">Ngày cưới</label>
            {weddingDatesArr.map((date, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <div className="flex-1">
                  <DatePicker
                    value={date}
                    onChange={(v) => {
                      const newDates = [...weddingDatesArr];
                      newDates[idx] = v;
                      onWeddingDateChange(newDates.filter(Boolean).join(','));
                    }}
                    placeholder="Chọn ngày"
                  />
                </div>
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newDates = weddingDatesArr.filter((_, i) => i !== idx);
                      onWeddingDateChange(newDates.filter(Boolean).join(','));
                    }}
                    className="p-1 text-text-muted hover:text-error transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => onWeddingDateChange([...weddingDatesArr, ""].filter(Boolean).join(','))}
              className="flex items-center gap-1 text-xs font-medium text-interactive hover:text-interactive-hover mt-1"
            >
              <Plus size={12} /> Thêm ngày
            </button>
          </div>
        )}

        <SimpleSelect
          label="Nhân viên phụ trách"
          value={formData.assigned_to || UNASSIGNED_EMPLOYEE_VALUE}
          onChange={(value) =>
            updateField(
              "assigned_to",
              value === UNASSIGNED_EMPLOYEE_VALUE ? "" : value,
            )
          }
          options={employeeOptions}
          placeholder={isLoadingEmployees ? "Đang tải nhân viên..." : "Chọn nhân viên..."}
          error={employeeError}
          disabled={isLoadingEmployees && employees.length === 0}
        />
      </div>



      {/* Description */}
      <Field label="Mô tả">
        <Textarea unstyled
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Mô tả gói dịch vụ, yêu cầu đặc biệt..."
          rows={3}
          className="input-base resize-none"
        />
      </Field>

      {/* Notes — gộp từ S6, ghi chú nội bộ */}
      <Field label="Ghi chú nội bộ">
        <Textarea unstyled
          value={formData.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Ghi chú nội bộ, không hiện trên hợp đồng in..."
          rows={3}
          className="input-base resize-none"
        />
      </Field>
    </section>
  );
}

// ── Field wrapper ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-base">{label}</label>
      {children}
    </div>
  );
}
