"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { UserPlus, X, AlertTriangle, Loader2, Clock, MapPin, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { CurrencyInput } from "@/components/ui/currency-input";
import { GroupedSelect } from "@/components/ui/grouped-select";
import { SimpleSelect } from "@/components/ui/simple-select";
import DatePicker from "@/components/ui/date-picker";
import { formatCurrency } from "@/lib/utils";
import {
  getWorkTypeLabel,
  getTaskStatusLabel,
  isOnSetEvent,
} from "@/types/contract-constants";
import {
  getTasksByEvent,
  getActiveEmployees,
  addTask,
  deleteTask,
  toggleTaskStatus,
} from "@/app/actions/work-task-actions";
import { checkEmployeeTimeOverlap } from "@/app/actions/task-overlap-actions";
import { updateContractEvent } from "@/app/actions/contract-event-actions";
import type { WorkType, TaskStatus, EventType } from "@/types/contract";

// ═══════════════════════════════════════════
// EventTaskModal — V2 port of V1 EventTaskModal
// V1 ref: 0Moodstudio/webapp/components/contracts/details/EventTaskModal.tsx
// SSOT: .input-base, .label-base, Badge, UnifiedModal, CurrencyInput
// ═══════════════════════════════════════════

// ─── Grouped work types — OptionGroup[] for SelectGrouped ────
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

// ─── Types ────────────────────────────────
interface EventForModal {
  id: string;
  event_type: EventType;
  title: string;
  event_date: string | null;
  deadline: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location: string | null;
  status: string;
}

interface TaskRow {
  id: string;
  work_type: string;
  assigned_to: string | null;
  status: string;
  cost: number;
  start_time?: string | null;
  end_time?: string | null;
  employees?: { id: string; full_name: string }[] | { id: string; full_name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
}

interface ConflictItem {
  id: string;
  work_type: string;
  start_time: string;
  end_time: string;
  event_title: string;
}

interface Props {
  isOpen: boolean;
  event: EventForModal;
  contractId: string;
  onClose: () => void;
  onSaved: () => void;
}

// ─── STATUS CYCLE (V1 logic) ──────────────
const STATUS_CYCLE: Record<string, TaskStatus> = {
  chua_lam: "dang_lam",
  dang_lam: "hoan_thanh",
  hoan_thanh: "chua_lam",
};

// ─── Component ────────────────────────────
export default function EventTaskModal({
  isOpen,
  event,
  contractId,
  onClose,
  onSaved,
}: Props) {
  const isOnSet = isOnSetEvent(event.event_type);

  // Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New task form — V1 ref: L119-125
  const [form, setForm] = useState({
    work_type: (isOnSet ? "chup_anh" : "hau_ky_anh") as WorkType,
    assigned_to: "",
    cost: 0,
    start_time: event.start_time?.slice(0, 5) || "",
    end_time: event.end_time?.slice(0, 5) || "",
  });

  // Conflicts (V1: time overlap data)
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  // Form ref for closure-safe reads (W3 fix)
  const formRef = useRef(form);
  formRef.current = form;

  // Debounced toggle ref (V1 optimistic pattern)
  const pendingRef = useRef<
    Map<string, { original: string; timer: ReturnType<typeof setTimeout> }>
  >(new Map());

  // ─── Fetch data ───────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskResult, empResult] = await Promise.all([
        getTasksByEvent(event.id),
        getActiveEmployees(),
      ]);
      if (taskResult.success && taskResult.data) {
        setTasks(taskResult.data as TaskRow[]);
      }
      if (empResult.success && empResult.data) {
        setEmployees(empResult.data as Employee[]);
      }
    } catch {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  // ─── Check time overlap (V1 ref: L170-208) ───
  const doConflictCheck = useCallback(
    async (empId: string, startT: string, endT: string) => {
      if (!isOnSet || !empId || !startT || !endT || !event.event_date) {
        setConflicts([]);
        return;
      }
      try {
        const result = await checkEmployeeTimeOverlap(
          empId,
          event.event_date,
          startT,
          endT
        );
        if (result.success && result.data?.hasConflict) {
          setConflicts(result.data.conflicts as ConflictItem[]);
        } else {
          setConflicts([]);
        }
      } catch {
        setConflicts([]);
      }
    },
    [isOnSet, event.event_date]
  );

  // Trigger conflict check when employee or time changes
  const handleEmployeeChange = useCallback(
    (empId: string) => {
      setForm((prev) => ({ ...prev, assigned_to: empId }));
      // Read from ref to avoid stale closure (W3 fix)
      doConflictCheck(empId, formRef.current.start_time, formRef.current.end_time);
    },
    [doConflictCheck]
  );

  const handleTimeChange = useCallback(
    (field: "start_time" | "end_time", val: string) => {
      setForm((prev) => {
        const updated = { ...prev, [field]: val };
        doConflictCheck(updated.assigned_to, updated.start_time, updated.end_time);
        return updated;
      });
    },
    [doConflictCheck]
  );

  // ─── Add task (V1 ref: L211-253) ────────
  const handleAdd = async () => {
    if (submitting) return;
    if (!form.assigned_to) {
      toast.error("Chọn nhân sự trước");
      return;
    }
    setSubmitting(true);
    try {
      await addTask({
        contractId,
        eventId: event.id,
        workType: form.work_type,
        assignedTo: form.assigned_to || undefined,
        cost: form.cost,
        deadline: (isOnSet ? event.event_date : event.deadline) ?? undefined,
        startTime: isOnSet && form.start_time ? form.start_time : undefined,
        endTime: isOnSet && form.end_time ? form.end_time : undefined,
      });
      toast.success("Đã thêm nhân sự!");
      setForm((prev) => ({ ...prev, assigned_to: "", cost: 0 }));
      setConflicts([]);
      loadData();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi thêm task");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete task ──────────────────────────
  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId, event.id);
      toast.success("Đã xóa");
      loadData();
      onSaved();
    } catch {
      toast.error("Lỗi xóa");
    }
  };

  // ─── Toggle status (optimistic + debounced) ──
  const handleToggle = (task: TaskRow) => {
    const currentStatus = task.status;
    const newStatus = STATUS_CYCLE[currentStatus] || "chua_lam";

    const existing = pendingRef.current.get(task.id);
    const originalStatus = existing ? existing.original : currentStatus;
    if (existing) clearTimeout(existing.timer);

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    const timer = setTimeout(async () => {
      try {
        await toggleTaskStatus(task.id, newStatus as TaskStatus, event.id);
        onSaved();
      } catch {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: originalStatus } : t
          )
        );
        toast.error("Lỗi cập nhật");
      } finally {
        pendingRef.current.delete(task.id);
      }
    }, 300);

    pendingRef.current.set(task.id, { original: originalStatus, timer });
  };

  // ─── Total cost ─────────────────────────
  const totalCost =
    tasks.reduce((sum, t) => sum + (Number(t.cost) || 0), 0) +
    (Number(form.cost) || 0);

  // ─── Footer ──────────────────────────────
  const footer = (
    <div className="flex items-center justify-between w-full">
      <div>
        <span className="text-overline">Tổng chi phí</span>
        <p className="text-body-sm font-bold text-error">
          {formatCurrency(totalCost)}
        </p>
      </div>
      <button onClick={onClose} className="btn btn-secondary">
        Đóng
      </button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={event.title}
      footer={footer}
      size="xl"
    >
      <div className="space-y-4">
        {/* ── Date + Info Pills (V1 ref: L299-343) ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <DatePicker
            compact
            value={isOnSet ? (event.event_date || undefined) : (event.deadline || undefined)}
            placeholder="Chọn ngày"
            triggerClassName="!min-h-[28px] !py-1 !px-2.5 !text-xs !rounded-full !border-border !font-bold"
            onChange={async (dateStr) => {
              if (!dateStr) return;
              try {
                const field = isOnSet ? "event_date" : "deadline";
                const result = await updateContractEvent(event.id, {
                  [field]: dateStr,
                  ...(!isOnSet && { is_manual_date: true }),
                });
                if (!result.success) throw new Error(result.error);
                toast.success("Đã cập nhật ngày!");
                onSaved();
              } catch {
                toast.error("Lỗi cập nhật ngày");
              }
            }}
          />
          {isOnSet && event.start_time && event.end_time && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-info/10 rounded-full text-caption font-bold text-info">
              <Clock size={11} />
              {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
            </span>
          )}
          {event.location && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 rounded-full text-caption font-bold text-success">
              <MapPin size={11} />
              {event.location}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold ${
              isOnSet
                ? "bg-success/10 text-success"
                : "bg-interactive-light text-interactive"
            }`}
          >
            <CalendarCheck size={11} />
            {isOnSet ? "On-set" : "Hậu kỳ / Giao SP"}
          </span>
        </div>

        {/* ── Existing tasks ── */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-1.5">
            <h4 className="text-overline">
              Nhân sự đã giao ({tasks.length})
            </h4>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-hover/40 hover:bg-bg-hover group transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-label">
                      {(Array.isArray(task.employees) ? task.employees[0]?.full_name : task.employees?.full_name) || "Chưa giao"}
                    </span>
                    <span className="text-caption text-text-muted">
                      {getWorkTypeLabel(task.work_type as WorkType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-caption text-error font-semibold">
                      {formatCurrency(task.cost)}
                    </span>
                    {/* V1 ref L408-413: Show time on on-set tasks */}
                    {isOnSet && task.start_time && task.end_time && (
                      <span className="inline-flex items-center gap-0.5 text-caption text-interactive font-medium">
                        <Clock size={10} />
                        {task.start_time.slice(0, 5)} - {task.end_time.slice(0, 5)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(task)}
                  className="shrink-0"
                >
                  <Badge
                    variant={
                      task.status === "hoan_thanh"
                        ? "success"
                        : task.status === "dang_lam"
                          ? "info"
                          : "neutral"
                    }
                  >
                    {getTaskStatusLabel(task.status as TaskStatus)}
                  </Badge>
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(task.id)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-full hover:bg-error/10 transition-all"
                >
                  <X size={14} className="text-error" />
                </button>
              </div>
            ))}
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
              onChange={(val) => handleEmployeeChange(val)}
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.full_name}${emp.department ? ` (${emp.department})` : ""}`,
              }))}
              placeholder="-- Chọn --"
            />
          </div>

          {/* Row 2: Cost + Time (V1 ref: L574-639) */}
          {/* On-set: 3 cols (cost + giờ BĐ + giờ KT) */}
          {/* Hậu kỳ: 1 col (chỉ cost, KHÔNG CÓ GIỜ) */}
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
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => handleTimeChange("start_time", e.target.value)}
                    className="input-base text-center"
                  />
                </div>
                <div>
                  <label className="label-base">Giờ KT</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => handleTimeChange("end_time", e.target.value)}
                    className="input-base text-center"
                  />
                </div>
              </>
            )}
          </div>

          {/* Conflict warning (V1 ref: L643-661) */}
          {conflicts.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl bg-error/5 flex items-start gap-2"
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

          {/* Add button — V1 ref L667: disabled when no employee */}
          <button
            onClick={handleAdd}
            disabled={submitting || !form.assigned_to}
            className="btn btn-primary w-full mt-3"
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
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}
