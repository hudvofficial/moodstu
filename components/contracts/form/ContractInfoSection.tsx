"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContractFormData } from "@/types/contract-form";
import { SERVICE_TYPE_GROUPS, SERVICE_TYPE_LABELS } from "@/types/contract-form";
import type { ContractScheduleInput } from "@/types/contract-schedule";
import type { ServiceType } from "@/types/contract";
import type { ActiveEmployee } from "@/types/employee";
import { getActiveEmployees } from "@/app/actions/employee-queries";
import DatePicker from "@/components/ui/date-picker";
import { GroupedSelect } from "@/components/ui/grouped-select";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  schedules: ContractScheduleInput[];
  updateSchedule: (index: number, patch: Partial<ContractScheduleInput>) => void;
  addSchedule: (eventType: ContractScheduleInput["eventType"]) => void;
  removeSchedule: (index: number) => void;
  badgeCode?: string;
  scheduleError?: string;
}

export function ContractInfoSection({
  formData,
  updateField,
  schedules,
  updateSchedule,
  addSchedule,
  removeSchedule,
  badgeCode,
  scheduleError,
}: Props) {
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <SimpleSelect
          label="Nhân viên phụ trách"
          value={formData.assigned_to || UNASSIGNED_EMPLOYEE_VALUE}
          onChange={(value) =>
            updateField("assigned_to", value === UNASSIGNED_EMPLOYEE_VALUE ? "" : value)
          }
          options={employeeOptions}
          placeholder={isLoadingEmployees ? "Đang tải nhân viên..." : "Chọn nhân viên..."}
          error={employeeError}
          disabled={isLoadingEmployees && employees.length === 0}
        />
      </div>

      <div className="rounded-xl bg-bg-hover/50 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Lịch trình thực hiện</p>
            <p className="mt-0.5 text-xs text-text-muted">Mỗi ngày là một sự kiện độc lập để theo dõi công việc và đồng bộ lịch.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {formData.service_type !== "ngay_cuoi" && formData.service_type !== "outsource" ? (
              <Button unstyled type="button" onClick={() => addSchedule("ngay_chup")} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-interactive hover:bg-interactive/10">
                <Plus size={14} /> Ngày chụp
              </Button>
            ) : null}
            {(["studio", "combo", "ngay_cuoi"] as ServiceType[]).includes(formData.service_type) ? (
              <Button unstyled type="button" onClick={() => addSchedule("ngay_to_chuc")} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-interactive hover:bg-interactive/10">
                <Plus size={14} /> Ngày lễ
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {schedules.map((schedule, index) => (
            <div data-testid="contract-schedule-row" key={schedule.id || `${schedule.eventType}-${index}`} className="grid gap-3 rounded-lg bg-bg-card px-3 py-3 shadow-xs md:grid-cols-[88px_minmax(120px,1fr)_minmax(150px,1fr)_auto] md:items-end">
              <div>
                <span className="label-base">Loại mốc</span>
                <span className="inline-flex min-h-10 w-full items-center text-sm font-medium text-text-secondary">
                  {schedule.eventType === "ngay_chup" ? "Ngày chụp" : "Ngày lễ"}
                </span>
              </div>
              <div>
                <label className="label-base" htmlFor={`schedule-title-${index}`}>Tên sự kiện</label>
                <Input
                  unstyled
                  id={`schedule-title-${index}`}
                  data-testid="contract-schedule-title"
                  value={schedule.title}
                  onChange={(event) => updateSchedule(index, { title: event.target.value })}
                  placeholder={schedule.eventType === "ngay_chup" ? "Studio" : "Ăn hỏi, Ngày cưới..."}
                  className="input-base w-full"
                />
              </div>
              <DatePicker
                testId="contract-schedule-date"
                value={schedule.date}
                onChange={(date) => updateSchedule(index, { date })}
                label="Ngày diễn ra *"
                placeholder="Chọn ngày"
              />
              <div className="flex min-h-10 items-center justify-between gap-2 md:justify-end">
                {schedule.eventType === "ngay_to_chuc" ? (
                  <Button
                    unstyled
                    type="button"
                    onClick={() => updateSchedule(index, { isPrimaryWeddingDate: true })}
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${schedule.isPrimaryWeddingDate ? "bg-interactive/10 text-interactive" : "bg-bg-hover text-text-muted hover:text-text-primary"}`}
                    aria-pressed={schedule.isPrimaryWeddingDate}
                  >
                    {schedule.isPrimaryWeddingDate ? "Ngày chính" : "Chọn chính"}
                  </Button>
                ) : <span />}
                <Button unstyled type="button" onClick={() => removeSchedule(index)} aria-label={`Xóa ${schedule.title || "sự kiện"}`} className="rounded-lg p-2 text-text-muted transition-colors hover:bg-error/10 hover:text-error">
                  <X size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {scheduleError ? <p className="error-text mt-2">{scheduleError}</p> : null}
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
