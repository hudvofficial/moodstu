"use client";

import React from "react";
import { UserPlus, X, AlertTriangle, Loader2, Clock, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { GroupedSelect } from "@/components/ui/grouped-select";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
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
  vendor_id?: string | null;
  status: string;
  cost: number;
  start_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  employees?: { id: string; full_name: string }[] | { id: string; full_name: string } | null;
  vendors?: { id: string; full_name: string; phone: string | null } | null;
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

export interface TaskForm {
  work_type: WorkType;
  assigned_to: string;
  vendor_id?: string;
  cost: number;
  start_date: string;
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
  vendors?: any[];
  conflicts: ConflictItem[];
  submitting: boolean;
  deletingTaskIds?: Set<string>;
  // Handlers
  onStatusUpdate: (taskId: string, newStatus: string) => Promise<void>;
  onDelete: (taskId: string) => void;
  onAdd: () => void;
  onEmployeeChange: (empId: string) => void;
  onVendorChange?: (venId: string) => void;
  onAddVendor?: (name: string, phone: string, service_type: string) => Promise<any>;
  onTimeChange: (field: "start_date" | "start_time" | "end_time", val: string) => void;
  onCopyTasks?: () => void;
  isCopying?: boolean;
}

export function TaskListPanel({
  tasks,
  loading,
  isOnSet,
  form,
  setForm,
  employees,
  vendors = [],
  conflicts,
  submitting,
  deletingTaskIds = new Set(),
  onStatusUpdate,
  onDelete,
  onAdd,
  onEmployeeChange,
  onVendorChange,
  onAddVendor,
  onTimeChange,
}: TaskListPanelProps) {
  const [activeTab, setActiveTab] = React.useState<"employee" | "vendor">("employee");
  const [isAddingVendor, setIsAddingVendor] = React.useState(false);
  const [newVendorName, setNewVendorName] = React.useState("");
  const [newVendorPhone, setNewVendorPhone] = React.useState("");
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const assignedTasks = tasks.filter((task) => Boolean(task.assigned_to) || Boolean(task.vendor_id));
  const unassignedTasks = tasks.filter((task) => !task.assigned_to && !task.vendor_id);

  const renderTaskRow = (task: TaskRow, mode: "assigned" | "unassigned") => {
    const isDeleting = deletingTaskIds.has(task.id);
    const employeeName = Array.isArray(task.employees)
      ? task.employees[0]?.full_name
      : task.employees?.full_name;
    const vendorName = task.vendors?.full_name;
    const assigneeName = employeeName || vendorName;
    const isVendor = !!task.vendor_id;
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
              {mode === "assigned" ? assigneeName || "Nhân sự đã lưu" : workTypeLabel}
            </span>
            {isVendor && <span className="ml-1.5 text-text-muted text-[10px] font-normal italic">Thợ ngoài</span>}
            <span className="text-caption text-text-muted">
              {mode === "assigned" ? workTypeLabel : "Chưa giao"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex flex-col items-end">
              {task.cost > 0 && <span className="mr-3 text-text-primary text-caption text-error font-semibold">{formatCurrency(task.cost)}</span>}
              {(task.start_date || task.start_time || task.end_time) && (
                <span className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                  <Clock size={12} />
                  {task.start_date && <span>{new Date(task.start_date).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })} </span>}
                  {task.start_time && task.start_time.slice(0, 5)} 
                  {task.start_time && task.end_time && " - "} 
                  {task.end_time && task.end_time.slice(0, 5)}
                </span>
              )}
            </div>
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
              <div className="flex items-center justify-between">
                <h4 className="text-overline text-text-muted">
                  Nhân sự đã giao ({assignedTasks.length})
                </h4>
              </div>
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
      <div className="pt-4 border-t border-border mt-4">
        {!isFormOpen ? (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-text-muted hover:text-primary transition-colors py-2.5 border-2 border-dashed border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
          >
            <Plus size={16} />
            Thêm nhân sự
          </button>
        ) : (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-text-primary">Thêm nhân sự mới</span>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-error hover:bg-error/10 px-2 py-1 rounded-md transition-colors"
            >
              <X size={14} />
              Đóng
            </button>
          </div>
        )}

        {isFormOpen && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Row 1: Work type + Assignee */}
            <div>
          <GroupedSelect
            label="Loại việc"
            value={form.work_type}
            onChange={(val) =>
              setForm((prev) => ({ ...prev, work_type: val as WorkType }))
            }
            groups={WORK_TYPE_SELECT_GROUPS}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-3 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("employee")}
            className={`text-sm pb-1.5 font-medium transition-colors ${
              activeTab === "employee" ? "border-b-2 border-primary text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Nhân viên
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vendor")}
            className={`text-sm pb-1.5 font-medium transition-colors ${
              activeTab === "vendor" ? "border-b-2 border-primary text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Thợ ngoài
          </button>
        </div>

        {activeTab === "employee" && (
          <SimpleSelect
            label="Nhân sự nội bộ"
            value={form.assigned_to}
            onChange={(val) => onEmployeeChange(val)}
            options={employees.map((emp) => ({
              value: emp.id,
              label: `${emp.full_name}${emp.department ? ` (${emp.department})` : ""}`,
            }))}
            placeholder="-- Chọn --"
            testId="task-assignee-select"
          />
        )}

        {activeTab === "vendor" && !isAddingVendor && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SimpleSelect
                label="Thợ ngoài"
                value={form.vendor_id || ""}
                onChange={(val) => onVendorChange?.(val)}
                options={vendors.map((v) => ({
                  value: v.id,
                  label: `${v.full_name}${v.phone ? ` - ${v.phone}` : ""}`,
                }))}
                placeholder="-- Chọn thợ ngoài --"
              />
            </div>
            <button type="button" onClick={() => setIsAddingVendor(true)} title="Thêm thợ ngoài mới" className="h-9 w-9 mb-1 shrink-0 flex items-center justify-center rounded-md border border-border text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors">
              <Plus size={16} />
            </button>
          </div>
        )}

        {activeTab === "vendor" && isAddingVendor && (
          <div className="space-y-2 p-3 bg-bg-hover rounded-md border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Thêm thợ ngoài mới</span>
              <button type="button" onClick={() => setIsAddingVendor(false)} className="text-text-muted hover:text-error">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input unstyled placeholder="Họ tên thợ" value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} className="input-base text-sm py-1.5" />
              <Input unstyled placeholder="Số điện thoại" value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} className="input-base text-sm py-1.5" />
            </div>
            <Button unstyled
              type="button"
              onClick={async () => {
                if (!newVendorName) return;
                try {
                  await onAddVendor?.(newVendorName, newVendorPhone, "");
                  setIsAddingVendor(false);
                  setNewVendorName("");
                  setNewVendorPhone("");
                } catch (e: any) {
                  // toast handled in parent
                }
              }}
              disabled={!newVendorName}
              className="btn btn-primary w-full text-xs py-1.5"
            >
              Lưu & Chọn
            </Button>
          </div>
        )}

        {/* Row 2: Date + Time */}
        {isOnSet && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">Ngày làm</label>
              <DatePicker
                value={form.start_date || undefined}
                onChange={(dateStr) => onTimeChange("start_date", dateStr || "")}
                placeholder="Chọn ngày"
                triggerClassName="h-9 w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">Giờ BĐ</label>
              <Input unstyled
                type="time"
                value={form.start_time}
                onChange={(e) => onTimeChange("start_time", e.target.value)}
                className="input-base text-sm h-9 w-full px-2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">Giờ KT</label>
              <Input unstyled
                type="time"
                value={form.end_time}
                onChange={(e) => onTimeChange("end_time", e.target.value)}
                className="input-base text-sm h-9 w-full px-2"
              />
            </div>
          </div>
        )}

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

        {/* Row 3: Cost and Add button */}
        <div className="flex items-end gap-2 mt-3">
          <div className="flex-1">
            <CurrencyInput
              label="Chi phí (VND)"
              value={form.cost}
              onChange={(val) => setForm((prev) => ({ ...prev, cost: val }))}
            />
          </div>
          <Button unstyled
            onClick={onAdd}
            disabled={submitting || (!form.assigned_to && !form.vendor_id)}
            className="btn btn-primary h-9 w-12 shrink-0 flex items-center justify-center rounded-md"
            data-testid="add-task-submit"
            title="Lưu nhân sự"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <UserPlus size={18} />
            )}
          </Button>
        </div>
          </div>
        )}
      </div>
    </>
  );
}
