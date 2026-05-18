"use client";

import { UserPlus, X, AlertTriangle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { GroupedSelect } from "@/components/ui/grouped-select";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { getWorkTypeLabel } from "@/types/contract-constants";
import type { WorkType } from "@/types/contract";
import { SelectStatus } from "@/components/ui/select/SelectStatus";

// ═══════════════════════════════════════════
// TaskListPanel — Task list + Add form
// Extracted from EventTaskModal (V2 split)
// ═══════════════════════════════════════════

// ─── Types ────────────────────────────────
export interface TaskRow {
  id: string;
  work_type: string;
  assigned_to: string | null;
  status: string;
  cost: number;
  start_time?: string | null;
  end_time?: string | null;
  employees?: { id: string; full_name: string }[] | { id: string; full_name: string } | null;
}

export interface Employee {
  id: string;
  full_name: string;
  department: string | null;
}

export interface ConflictItem {
  id: string;
  work_type: string;
  start_time: string;
  end_time: string;
  event_title: string;
}

interface TaskForm {
  work_type: WorkType;
  assigned_to: string;
  cost: number;
  start_time: string;
  end_time: string;
}

// ─── Grouped work types ────────────────────
const WORK_TYPE_SELECT_GROUPS = [
  {
    groupName: "Sản xuất",
    color: "gold" as const,
    options: [
      { value: "chup_anh", label: "Chụp ảnh" },
      { value: "quay_phim", label: "Quay phim" },
      { value: "makeup", label: "Trang điểm" },
      { value: "tro_ly", label: "Trợ lý" },
      { value: "cameraman", label: "Cameraman" },
    ],
  },
  {
    groupName: "Tiền kỳ",
    color: "sky" as const,
    options: [
      { value: "concept", label: "Concept" },
      { value: "kich_ban", label: "Kịch bản" },
    ],
  },
  {
    groupName: "Hậu kỳ",
    color: "rose" as const,
    options: [
      { value: "hau_ky_anh", label: "Hậu kỳ ảnh" },
      { value: "dung_phim", label: "Dựng phim" },
      { value: "retouch", label: "Retouch" },
      { value: "premiere", label: "Premiere" },
      { value: "bien_tap", label: "Biên tập" },
    ],
  },
  {
    groupName: "Khác",
    color: "gold" as const,
    options: [{ value: "khac", label: "Khác" }],
  },
];

// ─── Status Options ────────────────────────
const TASK_STATUS_OPTIONS = [
  { value: "chua_lam", label: "Chờ", color: "var(--color-border)" }, // muted
  { value: "dang_lam", label: "Đang làm", color: "var(--color-warning)" },
  { value: "hoan_thanh", label: "Xong", color: "var(--color-success)" },
  { value: "da_huy", label: "Hủy", color: "var(--color-error)" },
];


// ─── Props ────────────────────────────────
interface TaskListPanelProps {
  tasks: TaskRow[];
  loading: boolean;
  isOnSet: boolean;
  // Form state
  form: TaskForm;
  setForm: React.Dispatch<React.SetStateAction<TaskForm>>;
  employees: Employee[];
  conflicts: ConflictItem[];
  submitting: boolean;
  deletingTaskIds?: Set<string>;
  // Handlers
  onStatusUpdate: (taskId: string, newStatus: string) => Promise<void>;
  onDelete: (taskId: string) => void;
  onAdd: () => void;
  onEmployeeChange: (empId: string) => void;
  onTimeChange: (field: "start_time" | "end_time", val: string) => void;
}

export function TaskListPanel({
  tasks,
  loading,
  isOnSet,
  form,
  setForm,
  employees,
  conflicts,
  submitting,
  deletingTaskIds = new Set(),
  onStatusUpdate,
  onDelete,
  onAdd,
  onEmployeeChange,
  onTimeChange,
}: TaskListPanelProps) {
  const assignedTasks = tasks.filter((task) => Boolean(task.assigned_to));
  const unassignedTasks = tasks.filter((task) => !task.assigned_to);

  const renderTaskRow = (task: TaskRow, mode: "assigned" | "unassigned") => {
    const isDeleting = deletingTaskIds.has(task.id);
    const employeeName = Array.isArray(task.employees)
      ? task.employees[0]?.full_name
      : task.employees?.full_name;
    const workTypeLabel = getWorkTypeLabel(task.work_type as WorkType);

    return (
      <div
        key={task.id}
        className={`flex items-center gap-2.5 p-2.5 rounded-md bg-bg-hover/40 hover:bg-bg-hover group transition-colors ${
          isDeleting ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-label">
              {mode === "assigned" ? employeeName || "Nhân sự đã lưu" : workTypeLabel}
            </span>
            <span className="text-caption text-text-muted">
              {mode === "assigned" ? workTypeLabel : "Chưa giao"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-caption text-error font-semibold">
              {formatCurrency(task.cost)}
            </span>
            {isOnSet && task.start_time && task.end_time && (
              <span className="inline-flex items-center gap-0.5 text-caption text-interactive font-medium">
                <Clock size={10} />
                {task.start_time.slice(0, 5)} - {task.end_time.slice(0, 5)}
              </span>
            )}
          </div>
        </div>

        <SelectStatus
          current={task.status}
          options={TASK_STATUS_OPTIONS}
          onUpdate={(newStatus) => onStatusUpdate(task.id, newStatus)}
          variant="compact"
        />

        <Button unstyled
          onClick={() => onDelete(task.id)}
          disabled={isDeleting}
          className="icon-btn h-8 w-8 shrink-0 rounded-full bg-error/10 text-error hover:text-error disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Xóa ${mode === "assigned" ? "phân công" : "công việc"} ${workTypeLabel}`}
        >
          {isDeleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
        </Button>
      </div>
    );
  };

  return (
    <>
      {/* ── Existing tasks ── */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : tasks.length > 0 ? (
        <div className="space-y-3">
          {assignedTasks.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-overline">
                Nhân sự đã giao ({assignedTasks.length})
              </h4>
              {assignedTasks.map((task) => renderTaskRow(task, "assigned"))}
            </div>
          )}

          {unassignedTasks.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-overline text-text-muted">
                Công việc chưa giao ({unassignedTasks.length})
              </h4>
              {unassignedTasks.map((task) => renderTaskRow(task, "unassigned"))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <UserPlus size={28} className="mx-auto text-text-muted mb-2" />
          <p className="text-body-sm text-text-muted">Chưa có nhân sự nào</p>
        </div>
      )}

      {/* ── Add task form ── */}
      <div className="pt-4">
        <h4 className="text-overline text-primary mb-3">
          + Thêm nhân sự
        </h4>

        {/* Row 1: Work type + Employee */}
        <div className="form-grid-2col">
          <GroupedSelect
            label="Loại việc"
            value={form.work_type}
            onChange={(val) =>
              setForm((prev) => ({ ...prev, work_type: val as WorkType }))
            }
            groups={WORK_TYPE_SELECT_GROUPS}
          />
          <SimpleSelect
            label="Nhân sự"
            value={form.assigned_to}
            onChange={(val) => onEmployeeChange(val)}
            options={employees.map((emp) => ({
              value: emp.id,
              label: `${emp.full_name}${emp.department ? ` (${emp.department})` : ""}`,
            }))}
            placeholder="-- Chọn --"
            testId="task-assignee-select"
          />
        </div>

        {/* Row 2: Cost + Time */}
        <div className={`grid ${isOnSet ? "grid-cols-3" : "grid-cols-1"} gap-3 mt-3`}>
          <CurrencyInput
            label="Chi phí"
            value={form.cost}
            onChange={(val) => setForm((prev) => ({ ...prev, cost: val }))}
            className="text-error"
          />
          {isOnSet && (
            <>
              <div>
                <label className="label-base">Giờ BĐ</label>
                <Input unstyled
                  type="time"
                  value={form.start_time}
                  onChange={(e) => onTimeChange("start_time", e.target.value)}
                  className="input-base text-center"
                />
              </div>
              <div>
                <label className="label-base">Giờ KT</label>
                <Input unstyled
                  type="time"
                  value={form.end_time}
                  onChange={(e) => onTimeChange("end_time", e.target.value)}
                  className="input-base text-center"
                />
              </div>
            </>
          )}
        </div>

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-md bg-error/5 flex items-start gap-2"
              >
                <AlertTriangle size={14} className="text-error shrink-0 mt-0.5" />
                <div className="text-caption text-error font-medium">
                  Trùng <strong>{c.event_title || getWorkTypeLabel(c.work_type as WorkType)}</strong>{" "}
                  {c.start_time.slice(0, 5)}-{c.end_time.slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add button */}
        <Button unstyled
          onClick={onAdd}
          disabled={submitting || !form.assigned_to}
          className="btn btn-primary w-full mt-3"
          data-testid="add-task-submit"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Đang thêm...
            </>
          ) : (
            <>
              <UserPlus size={14} />
              Thêm nhân sự
            </>
          )}
        </Button>
      </div>
    </>
  );
}
