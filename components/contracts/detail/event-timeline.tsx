"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays, Camera, Church, Pencil, Package,
  MapPin, AlertTriangle, ClipboardList, Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getEventTypeLabel, isOnSetEvent,
} from "@/types/contract-constants";
import { deleteContractEvent, updateContractEvent } from "@/app/actions/contract-event-actions";
import { Input } from "@/components/ui/input";
import { UnifiedModal } from "@/components/ui/unified-modal";
import DatePicker from "@/components/ui/date-picker";
import EventTaskModal from "@/components/contracts/detail/event-task-modal";
import type { ContractEvent, WorkTask, EventType, TaskStatus } from "@/types/contract";
import type { ActiveEmployee } from "@/types/employee";

// ═══════════════════════════════════════════
// EventTimeline — V2 Horizontal Grid Cards
// Layout: auto-fill grid (2 cols mobile, 4 cols desktop)
// Click card → EventTaskModal (no inline expand)
// SSOT: tokens only, Lucide icons only
// ═══════════════════════════════════════════

interface Props {
  events: ContractEvent[];
  tasks: WorkTask[];
  activeEmployees?: ActiveEmployee[];
  onRefresh?: () => void;
  onTaskStatusChange?: (taskId: string, eventId: string, status: TaskStatus) => void;
  onAddEvent?: () => void;
  onEventDeleted?: (eventId: string) => void;
}

// ─── Lucide Icon Mapping (SSOT: replaces emoji) ──────
const EVENT_ICON_MAP: Record<string, typeof CalendarDays> = {
  chuan_bi: ClipboardList,
  ngay_chup: Camera,
  ngay_to_chuc: Church,
  hau_ky: Pencil,
  giao_san_pham: Package,
};

function getEventIcon(eventType: string) {
  return EVENT_ICON_MAP[eventType] || CalendarDays;
}

function normalizeEventTitle(title: string | null | undefined, eventType: EventType): string {
  const trimmed = title?.trim();
  const fallback = getEventTypeLabel(eventType);
  if (!trimmed) return fallback;

  const normalized = trimmed.toLowerCase();
  const exactMap: Record<string, string> = {
    "ngay cuoi": "Ngày cưới",
    "giao san pham": "Giao sản phẩm",
    "du an": "Dự án",
    "ky yeu": "Kỷ yếu",
    "gia dinh": "Gia đình",
    "sinh nhat": "Sinh nhật",
  };

  if (exactMap[normalized]) return exactMap[normalized];
  if (normalized.startsWith("hau ky ")) {
    return `Hậu kỳ ${normalizeEventTitle(trimmed.slice(7), eventType)}`;
  }
  if (normalized.startsWith("thuc hien ")) {
    return `Thực hiện ${normalizeEventTitle(trimmed.slice(10), eventType)}`;
  }

  return trimmed;
}

// ─── Helpers (from V1/V2) ──────────────────────────────
function formatTime(t: string | null) {
  if (!t) return null;
  return t.slice(0, 5);
}

function getDisplayDate(event: ContractEvent): string | null {
  if (isOnSetEvent(event.event_type)) {
    return event.event_date ? formatDate(event.event_date) : null;
  }
  return event.deadline ? formatDate(event.deadline) : null;
}

function getDaysOverdue(event: ContractEvent): number | null {
  if (event.status === "hoan_thanh" || event.status === "da_huy") return null;
  const dateStr = isOnSetEvent(event.event_type)
    ? event.event_date
    : event.deadline;
  if (!dateStr) return null;
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff > 0 ? diff : null;
}

// ─── Card Style Resolver ──────────────────────────────
function getCardStyles(event: ContractEvent, isActive: boolean) {
  if (event.status === "hoan_thanh") {
    return "border-l-success bg-success/5";
  }
  if (isActive || event.status === "dang_lam") {
    return "border-l-primary bg-interactive-light border-primary/30";
  }
  return "border-l-border-primary bg-bg-card hover:bg-bg-hover/60";
}

// ─── Main Component ──────────────────────────────────
export default function EventTimeline({
  events,
  tasks,
  activeEmployees,
  onRefresh,
  onTaskStatusChange,
  onAddEvent,
  onEventDeleted,
}: Props) {
  const [modalEvent, setModalEvent] = useState<ContractEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ContractEvent | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; event_date: string; location: string }>({
    title: "", event_date: "", location: ""
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Sync modalEvent with incoming events prop (so Date Picker reflects SWR
  // refetch). Adjust state during render instead of in an effect to avoid a
  // cascading render.
  const [prevEvents, setPrevEvents] = useState(events);
  if (events !== prevEvents) {
    setPrevEvents(events);
    if (modalEvent) {
      const updated = events.find((e) => e.id === modalEvent.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(modalEvent)) {
        setModalEvent(updated);
      }
    }
  }

  // Sort by sort_order (V1 business logic), fallback to date
  const sorted = [...events].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (
      new Date(a.event_date || a.deadline || "9999-12-31").getTime() -
      new Date(b.event_date || b.deadline || "9999-12-31").getTime()
    );
  });

  // Auto-highlight: first non-complete event = active
  const activeEventId = sorted.find(
    (e) => e.status !== "hoan_thanh" && e.status !== "da_huy"
  )?.id ?? null;

  const deleteTargetTitle = deleteTarget
    ? normalizeEventTitle(deleteTarget.title, deleteTarget.event_type as EventType)
    : "sự kiện này";

  const handleDeleteEvent = async () => {
    const target = deleteTarget;
    if (!target || deletingEventId) return;

    setDeletingEventId(target.id);
    try {
      const result = await deleteContractEvent(target.id);
      if (!result.success) throw new Error(result.error);
      toast.success("Đã xóa sự kiện");
      if (modalEvent?.id === target.id) setModalEvent(null);
      setDeleteTarget(null);
      if (onEventDeleted) onEventDeleted(target.id);
      else onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi xóa sự kiện");
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !editForm.title.trim()) return;
    setIsSavingEdit(true);
    try {
      const result = await updateContractEvent(editingEvent.id, {
        title: editForm.title.trim(),
        event_date: editForm.event_date || null,
        location: editForm.location || null,
      });
      toast.success("Đã cập nhật sự kiện");
      setEditingEvent(null);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật sự kiện");
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="card-base p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="icon-box bg-primary/10">
              <CalendarDays size={16} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-body-sm font-bold text-text-primary">
                  Lịch trình sự kiện
                </h3>
                <Badge variant="neutral">0 SỰ KIỆN</Badge>
              </div>
              <p className="text-caption">Dự án: Mood Studio · {new Date().getFullYear()}</p>
            </div>
          </div>
          {onAddEvent && (
            <Button unstyled onClick={onAddEvent} className="btn btn-outline" data-testid="add-contract-event">
              <Plus size={14} />
              Thêm lịch
            </Button>
          )}
        </div>
        <div className="py-6 text-center">
          <CalendarDays size={28} className="mx-auto text-text-muted mb-2" />
          <p className="text-body-sm text-text-muted">Chưa có sự kiện nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="icon-box bg-primary/10">
            <CalendarDays size={16} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-sm font-bold text-text-primary">
                Lịch trình sự kiện
              </h3>
              <Badge variant="neutral">
                {sorted.length} SỰ KIỆN
              </Badge>
            </div>
            <p className="text-caption">Dự án: Mood Studio · {new Date().getFullYear()}</p>
          </div>
        </div>
        {onAddEvent && (
          <Button unstyled onClick={onAddEvent} className="btn btn-outline" data-testid="add-contract-event">
            <Plus size={14} />
            Thêm lịch
          </Button>
        )}
      </div>

      {/* Grid Cards — auto-fill: 2 cols mobile, 4 cols desktop */}
      <div
        className="grid gap-2 lg:gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        }}
      >
        {sorted.map((event) => {
          const eventTasks = tasks.filter((t) => t.event_id === event.id);
          const doneTasks = eventTasks.filter(
            (t) => t.status === "hoan_thanh"
          ).length;
          const inProgressTasks = eventTasks.filter(
            (t) => t.status === "dang_lam"
          ).length;
          const isActive = event.id === activeEventId;
          const overdueDays = getDaysOverdue(event);
          const displayDate = getDisplayDate(event);
          const isOnSet = isOnSetEvent(event.event_type);
          const Icon = getEventIcon(event.event_type);
          const displayTitle = normalizeEventTitle(
            event.title,
            event.event_type as EventType,
          );

          return (
            <div
              key={event.id}
              data-testid="contract-event-card"
              className={`
                relative min-w-0 border-l-[3px] rounded-md p-3 pr-9 cursor-pointer
                transition-all duration-200 hover:shadow-sm
                ${deletingEventId === event.id ? "opacity-60 pointer-events-none" : ""}
                ${getCardStyles(event, isActive)}
              `}
              onClick={() => setModalEvent(event)}
            >
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                <Button
                  unstyled
                  type="button"
                  aria-label="Sửa sự kiện"
                  title="Sửa sự kiện"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEvent(event);
                    setEditForm({
                      title: event.title || "",
                      event_date: event.event_date || event.deadline || "",
                      location: event.location || ""
                    });
                  }}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  unstyled
                  type="button"
                  aria-label={`Xóa sự kiện ${displayTitle}`}
                  title="Xóa sự kiện"
                  data-testid="contract-event-delete"
                  disabled={deletingEventId === event.id}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(event);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              {/* Status badge */}
              <div className="flex min-h-5 flex-wrap items-center gap-1.5 mb-2">
                {event.status === "hoan_thanh" ? (
                  <Badge variant="success" className="px-2 text-micro">XONG</Badge>
                ) : isActive || event.status === "dang_lam" ? (
                  <Badge variant="warning" className="px-2 text-micro">ĐANG LÀM</Badge>
                ) : (
                  <span className="h-5" />
                )}
                {overdueDays && (
                  <Badge variant="error" className="px-2 text-micro">
                    <AlertTriangle size={10} className="shrink-0" />
                    Trễ {overdueDays}d
                  </Badge>
                )}
              </div>

              {/* Icon + Title */}
              <div className="flex items-start gap-1.5 mb-1.5">
                <Icon size={14} className="text-text-muted shrink-0 mt-0.5" />
                <p className="text-body-sm font-semibold text-text-primary line-clamp-2 leading-tight">
                  {displayTitle}
                </p>
              </div>

              {/* Date + Location */}
              {displayDate && (
                <div className="flex items-center gap-1 mb-1">
                  <CalendarDays size={11} className="text-text-muted shrink-0" />
                  <span className="text-caption text-text-muted truncate">
                    {isOnSet ? "" : "Hạn: "}{displayDate}
                    {isOnSet && event.start_time && event.end_time && (
                      <> • {formatTime(event.start_time)}-{formatTime(event.end_time)}</>
                    )}
                  </span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1 mb-1">
                  <MapPin size={11} className="text-text-muted shrink-0" />
                  <span className="text-caption text-text-muted truncate">
                    {event.location}
                  </span>
                </div>
              )}

              {/* Progress bar — 3 màu: xanh (xong) + vàng (đang làm) + xám (chưa) */}
              {eventTasks.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex-1 h-1.5 bg-text-muted/20 rounded-full overflow-hidden flex">
                    {doneTasks > 0 && (
                      <div
                        className="h-full bg-success transition-all duration-500"
                        style={{ width: `${(doneTasks / eventTasks.length) * 100}%` }}
                      />
                    )}
                    {inProgressTasks > 0 && (
                      <div
                        className="h-full bg-warning transition-all duration-500"
                        style={{ width: `${(inProgressTasks / eventTasks.length) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="text-caption font-bold text-text-muted shrink-0">
                    {doneTasks}/{eventTasks.length}
                  </span>
                </div>
              )}

              {/* Hint khi chưa có task */}
              {eventTasks.length === 0 && event.status !== "hoan_thanh" && (
                <p className="text-caption text-text-muted mt-1 italic">
                  Chưa phân công
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* EventTaskModal */}
      {modalEvent && (
        <EventTaskModal
          isOpen={!!modalEvent}
          event={{
            id: modalEvent.id,
            event_type: modalEvent.event_type as EventType,
            title: normalizeEventTitle(
              modalEvent.title,
              modalEvent.event_type as EventType,
            ),
            event_date: modalEvent.event_date,
            deadline: modalEvent.deadline,
            location: modalEvent.location,
            status: modalEvent.status,
          }}
          contractId={modalEvent.contract_id}
          prefetchedTasks={tasks.filter(t => t.event_id === modalEvent.id)}
          prefetchedEmployees={activeEmployees}
          onClose={() => setModalEvent(null)}
          onSaved={() => onRefresh?.()}
          onTaskStatusChange={onTaskStatusChange}
        />
      )}

      {/* EditEventModal */}
      {editingEvent && (
        <UnifiedModal
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          title="Sửa Sự kiện"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button unstyled onClick={() => setEditingEvent(null)} className="btn btn-outline" disabled={isSavingEdit}>
                Hủy
              </Button>
              <Button unstyled onClick={handleSaveEdit} className="btn btn-primary" disabled={isSavingEdit || !editForm.title.trim()}>
                {isSavingEdit ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Tên sự kiện <span className="text-error">*</span></label>
              <Input
                unstyled
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="input-base w-full"
                placeholder="VD: Setup chiều 23"
              />
            </div>
            {isOnSetEvent(editingEvent.event_type as EventType) && (
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="text-sm font-medium text-text-primary">Ngày thực hiện</label>
                <DatePicker
                  value={editForm.event_date || undefined}
                  onChange={(dateStr) => setEditForm(prev => ({ ...prev, event_date: dateStr || "" }))}
                  placeholder="Chọn ngày"
                  triggerClassName="h-9 w-full"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Địa điểm</label>
              <Input
                unstyled
                value={editForm.location}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                className="input-base w-full"
                placeholder="Nhập địa điểm..."
              />
            </div>
          </div>
        </UnifiedModal>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteEvent()}
        title="Xóa sự kiện"
        message={`Xóa "${deleteTargetTitle}" khỏi lịch trình? Các phân công liên quan sẽ bị xóa theo.`}
        confirmLabel={deletingEventId ? "Đang xóa..." : "Xóa"}
        cancelLabel="Giữ lại"
        variant="danger"
      />
    </div>
  );
}
