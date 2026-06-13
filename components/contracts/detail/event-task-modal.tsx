"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Clock, MapPin, CalendarCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { formatCurrency } from "@/lib/utils";
import { isOnSetEvent } from "@/types/contract-constants";
import {
  getTasksByEvent,
  addTask,
  deleteTask,
  toggleTaskStatus,
  copyTasksFromPreviousEvent,
} from "@/app/actions/work-task-actions";
import { getActiveEmployees } from "@/app/actions/employee-queries";
import { getActiveVendors, quickAddVendor } from "@/app/actions/vendor-actions";
import { checkEmployeeTimeOverlap } from "@/app/actions/task-overlap-actions";
import { updateContractEvent } from "@/app/actions/contract-event-actions";
import type { WorkType, TaskStatus, EventType, WorkTask } from "@/types/contract";
import type { ActiveEmployee } from "@/types/employee";
import type { Vendor } from "@/types/vendor";
import { TaskListPanel } from "./task-list-panel";
import type { TaskRow, Employee, ConflictItem, TaskForm } from "./task-list-panel";

// EventTaskModal - V2 port of V1 EventTaskModal
// V2: TaskListPanel extracted to task-list-panel.tsx
// SSOT: .input-base, .label-base, Badge, UnifiedModal, CurrencyInput

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

interface Props {
  isOpen: boolean;
  event: EventForModal;
  contractId: string;
  prefetchedTasks?: WorkTask[];
  prefetchedEmployees?: ActiveEmployee[];
  onClose: () => void;
  onSaved: () => void;
  onTaskStatusChange?: (taskId: string, eventId: string, status: TaskStatus) => void;
}

export default function EventTaskModal({
  isOpen,
  event,
  contractId,
  prefetchedTasks,
  prefetchedEmployees,
  onClose,
  onSaved,
  onTaskStatusChange,
}: Props) {
  const isOnSet = isOnSetEvent(event.event_type);

  // Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingTaskIds, setDeletingTaskIds] = useState<Set<string>>(() => new Set());

  // New task form
  const [form, setForm] = useState<TaskForm>({
    work_type: (isOnSet ? "chup_anh" : "hau_ky_anh") as WorkType,
    assigned_to: "",
    vendor_id: "",
    cost: 0,
    start_date: event.event_date || "",
    start_time: event.start_time?.slice(0, 5) || "",
    end_time: event.end_time?.slice(0, 5) || "",
  });

  // Conflicts
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  // Form ref for closure-safe reads (W3 fix). Update in an effect rather than
  // assigning during render — refs must not be written during render.
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  });

  // Track if initial prefetch has been used
  const usedPrefetchRef = useRef(false);

  // Reset prefetch flag when event changes
  useEffect(() => {
    usedPrefetchRef.current = false;
  }, [event.id]);

  // Fetch modal data, using prefetched rows for first paint.
  const loadData = useCallback(async (forceRefresh = false) => {
    // Instant-load: use prefetched data on first open (zero network)
    if (!forceRefresh && !usedPrefetchRef.current && prefetchedTasks && prefetchedEmployees?.length) {
      setTasks(prefetchedTasks as unknown as TaskRow[]);
      setEmployees(prefetchedEmployees as unknown as Employee[]);
      setLoading(false);
      usedPrefetchRef.current = true;
      return;
    }

    setLoading(true);
    try {
      const [taskResult, empResult, vendorResult] = await Promise.all([
        getTasksByEvent(event.id),
        prefetchedEmployees?.length
          ? Promise.resolve({ success: true as const, data: prefetchedEmployees })
          : getActiveEmployees(),
        getActiveVendors(),
      ]);
      if (!taskResult.success) {
        throw new Error(taskResult.error || "Loi tai danh sach task");
      }
      if (!empResult.success) {
        throw new Error(empResult.error || "Loi tai danh sach nhan su");
      }
      if (taskResult.data) {
        setTasks(taskResult.data as unknown as TaskRow[]);
      }
      if (empResult.data) {
        setEmployees(empResult.data as Employee[]);
      }
      if (vendorResult?.success && vendorResult.data) {
        setVendors(vendorResult.data as Vendor[]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Loi tai du lieu");
    } finally {
      setLoading(false);
    }
    usedPrefetchRef.current = true;
  }, [event.id, prefetchedTasks, prefetchedEmployees]);

  useEffect(() => {
    // loadData triggers an async fetch; the setState inside it is a load
    // trigger, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, event.id]);

  const [prevEventIdForDeleting, setPrevEventIdForDeleting] = useState(event.id);
  if (event.id !== prevEventIdForDeleting) {
    setPrevEventIdForDeleting(event.id);
    setDeletingTaskIds(new Set());
  }

  // Check time overlap for on-set assignments.
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

  const handleEmployeeChange = useCallback(
    (empId: string) => {
      setForm((prev) => ({ ...prev, assigned_to: empId, vendor_id: "" }));
      doConflictCheck(empId, formRef.current.start_time, formRef.current.end_time);
    },
    [doConflictCheck]
  );

  const handleVendorChange = useCallback(
    (venId: string) => {
      setForm((prev) => ({ ...prev, vendor_id: venId, assigned_to: "" }));
      setConflicts([]); // Vendors might not need conflict check in the same way, or skip for now
    },
    []
  );

  const handleTimeChange = useCallback(
    (field: "start_date" | "start_time" | "end_time", val: string) => {
      setForm((prev) => {
        const next = { ...prev, [field]: val };
        // conflict check mostly relies on time, but we should pass date too ideally. For now, keep signature.
        if (next.assigned_to && field !== "start_date") {
          doConflictCheck(next.assigned_to, next.start_time, next.end_time);
        }
        return next;
      });
    },
    [doConflictCheck]
  );

  // Add task.
  const handleAdd = async () => {
    if (submitting) return;
    if (!form.assigned_to && !form.vendor_id) {
      toast.error("Chọn nhân sự trước");
      return;
    }

    const previousTasks = tasks;
    const selectedEmployee = employees.find((emp) => emp.id === form.assigned_to);
    const selectedVendor = vendors.find((v) => v.id === form.vendor_id);
    const optimisticId = `optimistic-${event.id}-${Date.now()}`;
    const optimisticTask: TaskRow = {
      id: optimisticId,
      work_type: form.work_type,
      assigned_to: form.assigned_to,
      vendor_id: form.vendor_id,
      status: "dang_lam",
      cost: Number(form.cost) || 0,
      start_date: form.start_date || null,
      start_time: isOnSet && form.start_time ? form.start_time : null,
      end_time: isOnSet && form.end_time ? form.end_time : null,
      employees: selectedEmployee
        ? { id: selectedEmployee.id, full_name: selectedEmployee.full_name }
        : null,
      vendors: selectedVendor
        ? { id: selectedVendor.id, full_name: selectedVendor.full_name, phone: selectedVendor.phone }
        : null,
    };

    setSubmitting(true);
    setTasks((prev) => [...prev, optimisticTask]);

    try {
      const result = await addTask({
        contractId,
        eventId: event.id,
        workType: form.work_type,
        assignedTo: form.assigned_to || undefined,
        vendorId: form.vendor_id || undefined,
        cost: form.cost,
        deadline: (isOnSet ? event.event_date : event.deadline) ?? undefined,
        startDate: form.start_date || undefined,
        startTime: isOnSet && form.start_time ? form.start_time : undefined,
        endTime: isOnSet && form.end_time ? form.end_time : undefined,
      });
      if (!result.success) throw new Error(result.error);
      const savedTask = (result.data || {}) as Partial<TaskRow>;
      const savedId = typeof savedTask.id === "string" ? savedTask.id : optimisticId;
      setTasks((prev) =>
        prev.map((task) =>
          task.id === optimisticId
            ? {
                ...task,
                ...savedTask,
                id: savedId,
                employees: savedTask.employees ?? task.employees,
                vendors: savedTask.vendors ?? task.vendors,
              }
            : task,
        ),
      );
      toast.success("Đã thêm nhân sự!");
      setForm((prev) => ({ ...prev, assigned_to: "", vendor_id: "", cost: 0 }));
      setConflicts([]);
      onSaved();
    } catch (err) {
      setTasks(previousTasks);
      toast.error(err instanceof Error ? err.message : "Lỗi thêm task");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete task with optimistic UI.
  const handleDelete = async (taskId: string) => {
    if (deletingTaskIds.has(taskId)) return;
    const previousTasks = tasks;

    setDeletingTaskIds((prev) => new Set(prev).add(taskId));
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    try {
      const result = await deleteTask(taskId, event.id);
      if (!result.success) throw new Error(result.error);
      toast.success("Đã xóa nhân sự");
      onSaved();
    } catch (err) {
      setTasks(previousTasks);
      toast.error(err instanceof Error ? err.message : "Lỗi xóa nhân sự");
    } finally {
      setDeletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };
  // Update status with optimistic UI.
  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    const previousStatus = tasks.find((t) => t.id === taskId)?.status;
    if (!previousStatus || previousStatus === newStatus) return;

    const applyStatus = (status: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
      onTaskStatusChange?.(taskId, event.id, status as TaskStatus);
    };

    void runOptimisticMutation({
      apply: () => applyStatus(newStatus),
      rollback: () => applyStatus(previousStatus),
      action: () => toggleTaskStatus(taskId, newStatus as TaskStatus, event.id),
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Lỗi cập nhật task");
      },
    });
  };

  const handleAddVendor = async (name: string, phone: string, service_type: string) => {
    const result = await quickAddVendor({ full_name: name, phone, service_type });
    if (result.success && result.data) {
      setVendors((prev) => [...prev, result.data as Vendor]);
      setForm((prev) => ({ ...prev, vendor_id: (result.data as Vendor).id, assigned_to: "" }));
      return result.data;
    }
    const errObj = result as any;
    throw new Error(errObj.error || "Lỗi thêm thợ ngoài");
  };

  // Total cost.
  const totalCost =
    tasks.reduce((sum, t) => sum + (Number(t.cost) || 0), 0) +
    (Number(form.cost) || 0);

  // Footer.
  const footer = (
    <div className="flex items-center justify-between w-full">
      <div>
        <span className="text-overline">Tổng chi phí</span>
        <p className="text-body-sm font-bold text-error">
          {formatCurrency(totalCost)}
        </p>
      </div>
      <Button unstyled onClick={onClose} className="btn btn-secondary">
        Đóng
      </Button>
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
        {/* Date + info pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <DatePicker
            compact
            value={isOnSet ? (event.event_date || undefined) : (event.deadline || undefined)}
            placeholder="Chọn ngày"
            triggerClassName="!min-h-7 !py-1 !px-2.5 !text-xs !rounded-full !border-border !font-bold"
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

        {/* Task list + add form */}
        <TaskListPanel
          tasks={tasks}
          loading={loading}
          isOnSet={isOnSet}
          form={form}
          setForm={setForm}
          employees={employees}
          vendors={vendors}
          conflicts={conflicts}
          submitting={submitting}
          deletingTaskIds={deletingTaskIds}
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onEmployeeChange={handleEmployeeChange}
          onVendorChange={handleVendorChange}
          onAddVendor={handleAddVendor}
          onTimeChange={handleTimeChange}
        />
      </div>
    </UnifiedModal>
  );
}
