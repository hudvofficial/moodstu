"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Switch } from "@/components/ui/switch";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, CalendarSchedulePayload } from "@/app/actions/calendar-mutations";
import { updateCalendarTaskDetails } from "@/app/actions/calendar-task-actions";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { Role } from "@/types/roles";
import { AlignLeft, CalendarDays, ChevronDown, Clock3, ExternalLink, FileText, MapPin, Trash, Edit2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import DatePicker from "@/components/ui/date-picker";
import { format } from "date-fns";
import { EventViewDrawer } from "./event-view-drawer";

interface EventFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: UnifiedCalendarEvent | null;
  defaultDate?: Date | null;
  employees: { id: string; name: string }[];
  currentUserId?: string;
  userRole: Role;
  isGoogleConnected: boolean;
  onSuccess?: () => void;
}

const DEFAULT_START_TIME = "09:00";
const DEFAULT_DURATION_MINUTES = 60;

function toLocalDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function roundToNextQuarter(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const nextMinutes = Math.ceil(minutes / 15) * 15;
  rounded.setMinutes(nextMinutes);
  return rounded;
}

function splitDateTime(value?: string | null, fallbackDate = new Date()) {
  if (!value) {
    return { date: toLocalDateKey(fallbackDate), time: DEFAULT_START_TIME, hasTime: true };
  }

  if (!value.includes("T")) {
    return { date: value, time: DEFAULT_START_TIME, hasTime: false };
  }

  const [date, rawTime] = value.split("T");
  return { date, time: (rawTime || DEFAULT_START_TIME).slice(0, 5), hasTime: true };
}

function combineLocalDateTime(date: string, time: string) {
  return `${date}T${time || DEFAULT_START_TIME}`;
}

function addMinutesToLocalDateTime(date: string, time: string, minutes: number) {
  const base = new Date(`${date}T${time || DEFAULT_START_TIME}`);
  base.setMinutes(base.getMinutes() + minutes);
  return {
    date: toLocalDateKey(base),
    time: format(base, "HH:mm"),
  };
}

function formatReadableDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function EventFormDrawer({
  open,
  onOpenChange,
  event,
  defaultDate,
  employees,
  currentUserId,
  userRole,
  isGoogleConnected,
  onSuccess
}: EventFormDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(!event); // Auto edit if creating new
  const [showTimeFields, setShowTimeFields] = useState(true);
  const [allDay, setAllDay] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const isEditing = !!event;
  const source = event?.source || "schedule";
  const isGlobalAdmin = userRole === "admin" || userRole === "manager";

  const formatDatetimeLocal = (date?: Date | null, isoString?: string | null) => {
    if (isoString) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
        return `${isoString}T09:00`;
      }
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      return format(d, "yyyy-MM-dd'T'HH:mm");
    }
    if (date) {
      if (isNaN(date.getTime())) return "";
      return format(date, "yyyy-MM-dd'T'HH:mm");
    }
    return "";
  };

  const [formData, setFormData] = useState<CalendarSchedulePayload>({
    title: "",
    event_date: "",
    end_date: "",
    employee_id: "",
    color_id: "blue",
    sync_to_google: false,
    location: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (isEditing && event) {
         setFormData({
            eventId: event.id,
            title: event.title,
            event_date: formatDatetimeLocal(null, event.start),
            end_date: event.end ? formatDatetimeLocal(null, event.end) : "",
            employee_id: event.employeeId || "",
            color_id: event.colorToken || "blue",
            location: event.location || "",
            notes: event.notes || "",
         });
         const startParts = splitDateTime(event.start);
         setShowTimeFields(startParts.hasTime);
         setAllDay(!startParts.hasTime || event.allDay);
         setShowMoreOptions(Boolean(event.location || event.notes));
         // If we open an existing event, default to view mode
         setIsEditMode(false);
      } else {
         const initialDate = defaultDate ? defaultDate : new Date();
         const defaultEmployee = isGlobalAdmin ? "" : (currentUserId || "");
         const selectedDate = toLocalDateKey(initialDate);
         const isToday = selectedDate === toLocalDateKey(new Date());
         const roundedStart = isToday ? roundToNextQuarter(new Date()) : new Date(`${selectedDate}T${DEFAULT_START_TIME}`);
         const startTime = format(roundedStart, "HH:mm");
         const endParts = addMinutesToLocalDateTime(selectedDate, startTime, DEFAULT_DURATION_MINUTES);
         setFormData({
            title: "",
            event_date: combineLocalDateTime(selectedDate, startTime),
            end_date: combineLocalDateTime(endParts.date, endParts.time),
            employee_id: defaultEmployee,
            color_id: "blue",
            location: "",
            notes: "",
         });
         setShowTimeFields(false);
         setAllDay(false);
         setShowMoreOptions(false);
         setIsEditMode(true);
      }
      setError(null);
    }
  }, [open, isEditing, event, defaultDate, isGlobalAdmin, currentUserId, source]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // External Google events stay read-only inside Mood Studio.
    if (source === "google") {
      setError("Sự kiện Google chỉ được xem trong Mood Studio.");
      return;
    }

    if (source === "task" && event) {
      if (!formData.event_date || !formData.employee_id) {
        setError("Vui lòng chọn ngày và người phụ trách.");
        return;
      }

      const taskUpdates: {
        deadline?: string;
        start_date?: string;
        assigned_to?: string;
      } = {};
      const nextTaskDate = formData.event_date.split("T")[0];

      if (event.originalDateField === "start_date") {
        taskUpdates.start_date = nextTaskDate;
      } else {
        taskUpdates.deadline = nextTaskDate;
      }

      if (isGlobalAdmin && formData.employee_id !== event.employeeId) {
        taskUpdates.assigned_to = formData.employee_id;
      }
      const taskId = event.id;

      // Đóng drawer NGAY; server cập nhật + revalidate qua onSuccess. Lỗi → toast (drawer đã đóng).
      onOpenChange(false);
      startTransition(async () => {
        try {
          const res = await updateCalendarTaskDetails(taskId, taskUpdates);
          if (!res.success) throw new Error(res.error || "Thao tác thất bại.");
          toast.success("Đã cập nhật nhiệm vụ!");
          onSuccess?.();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Lỗi giao tiếp máy chủ.");
        }
      });
      return;
    }

    const startParts = splitDateTime(formData.event_date);
    const endParts = splitDateTime(formData.end_date || null, new Date(`${startParts.date}T00:00:00`));
    const isDateOnly = allDay || !showTimeFields;
    const submitPayload: CalendarSchedulePayload = {
      ...formData,
      event_date: isDateOnly ? startParts.date : combineLocalDateTime(startParts.date, startParts.time),
      end_date: isDateOnly
        ? (formData.end_date && endParts.date !== startParts.date ? endParts.date : null)
        : combineLocalDateTime(endParts.date, endParts.time),
      location: formData.location?.trim() || null,
      notes: formData.notes?.trim() || null,
    };

    if (!submitPayload.title.trim() || !submitPayload.event_date || !submitPayload.employee_id) {
       setError("Vui lòng điền đủ Tiêu đề, Ngày bắt/kết và người phụ trách.");
       return;
    }
 
    if (!isDateOnly && submitPayload.end_date && new Date(submitPayload.end_date).getTime() < new Date(submitPayload.event_date).getTime()) {
       setError("Giờ kết thúc phải sau giờ bắt đầu.");
       return;
    }

    // Đóng drawer NGAY; server sinh id + Google sync, revalidate qua onSuccess. Lỗi → toast.
    onOpenChange(false);
    startTransition(async () => {
       try {
          const res = isEditing
            ? await updateCalendarEvent(submitPayload)
            : await createCalendarEvent(submitPayload);

          if (!res.success) throw new Error(res.error || "Thao tác thất bại.");

          if (res.data && typeof res.data === "object" && 'warning' in res.data && res.data.warning) {
             toast.warning(res.data.warning, { duration: 5000 });
          } else {
             toast.success(isEditing ? "Đã cập nhật sự kiện!" : "Đã tạo sự kiện!");
          }

          onSuccess?.();
       } catch (err) {
          toast.error(err instanceof Error ? err.message : "Lỗi giao tiếp máy chủ.");
       }
    });
  };

  const handleDelete = () => {
     if (!event?.id) return;
     if (!confirm("Bạn có chắc chắn muốn xoá sự kiện này?")) return;
     const eventId = event.id;
     // Đóng drawer NGAY; revalidate qua onSuccess. Lỗi → toast (drawer đã đóng).
     onOpenChange(false);
     startTransition(async () => {
       try {
           const res = await deleteCalendarEvent(eventId);
           if (!res.success) throw new Error(res.error || "Xoá sự kiện thất bại.");
           toast.success("Đã xoá sự kiện!");
           onSuccess?.();
       } catch (err) {
          toast.error(err instanceof Error ? err.message : "Lỗi giao tiếp máy chủ.");
       }
    });
  };

  // ================= VIEW MODE =================
  if (!isEditMode && isEditing && event) {
    return (
      <EventViewDrawer
        open={open}
        onOpenChange={onOpenChange}
        event={event}
        source={source}
        setIsEditMode={setIsEditMode}
        handleDelete={handleDelete}
        isPending={isPending}
      />
    );
  }

  if (!isEditing && source === "schedule") {
    const startParts = splitDateTime(formData.event_date);
    const endParts = splitDateTime(formData.end_date || null, new Date(`${startParts.date}T00:00:00`));
    const timeSummary = allDay || !showTimeFields
      ? `${formatReadableDate(startParts.date)} · Cả ngày`
      : `${formatReadableDate(startParts.date)} · ${startParts.time} - ${endParts.time}`;

    const setStartDate = (date: string) => {
      const nextEnd = addMinutesToLocalDateTime(date, startParts.time, DEFAULT_DURATION_MINUTES);
      setFormData({
        ...formData,
        event_date: combineLocalDateTime(date, startParts.time),
        end_date: combineLocalDateTime(nextEnd.date, nextEnd.time),
      });
    };

    const setStartTime = (time: string) => {
      const nextEnd = addMinutesToLocalDateTime(startParts.date, time, DEFAULT_DURATION_MINUTES);
      setFormData({
        ...formData,
        event_date: combineLocalDateTime(startParts.date, time),
        end_date: combineLocalDateTime(nextEnd.date, nextEnd.time),
      });
    };

    return (
      <Drawer isOpen={open} onClose={() => onOpenChange(false)} title="Tạo lịch trình" width="480px">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pb-4">
            {error && <div className="error-text shrink-0">{error}</div>}

            <Input
              autoFocus
              placeholder="Thêm tiêu đề"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isPending}
              className="h-12 text-lg font-semibold"
              aria-label="Tiêu đề sự kiện"
            />

            <div className="inline-flex rounded-lg bg-bg-hover p-1">
              <div className="rounded-md bg-bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-sm">
                Sự kiện
              </div>
            </div>

            <section className="space-y-3 rounded-lg border border-border bg-bg-card p-3">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-1 size-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-primary">{timeSummary}</div>
                  <div className="mt-1 text-xs text-text-muted">Không lặp lại</div>
                </div>
                {!showTimeFields && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowTimeFields(true);
                      setAllDay(false);
                    }}
                    className="shrink-0"
                  >
                    Thêm thời gian
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DatePicker
                  label="Ngày bắt đầu"
                  compact
                  value={startParts.date}
                  onChange={setStartDate}
                  className="w-full min-w-0"
                />

                {showTimeFields && !allDay && (
                  <Input
                    label="Giờ bắt đầu"
                    type="time"
                    value={startParts.time}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={isPending}
                  />
                )}

                <DatePicker
                  label="Ngày kết thúc"
                  compact
                  value={endParts.date}
                  onChange={(date) => {
                    setFormData({
                      ...formData,
                      end_date: allDay || !showTimeFields ? date : combineLocalDateTime(date, endParts.time),
                    });
                  }}
                  className="w-full min-w-0"
                />

                {showTimeFields && !allDay && (
                  <Input
                    label="Giờ kết thúc"
                    type="time"
                    value={endParts.time}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        end_date: combineLocalDateTime(endParts.date, e.target.value),
                      });
                    }}
                    disabled={isPending}
                  />
                )}
              </div>

              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-bg-hover px-3 py-2">
                <span className="text-sm font-medium text-text-primary">Cả ngày</span>
                <Switch checked={allDay} onCheckedChange={setAllDay} disabled={isPending} aria-label="Cả ngày" />
              </label>
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-bg-card p-3">
              <div className="flex items-center gap-3">
                <CalendarDays className="size-4 shrink-0 text-text-muted" />
                <SimpleSelect
                  value={formData.employee_id}
                  onChange={(value) => setFormData({ ...formData, employee_id: value })}
                  disabled={isPending || !isGlobalAdmin}
                  options={employees.map(e => ({ value: e.id, label: e.name }))}
                  placeholder="Chọn nhân sự phụ trách"
                />
              </div>

              {isGoogleConnected && (
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-bg-hover px-3 py-2">
                  <span className="text-sm font-medium text-text-primary">Đồng bộ Google Calendar</span>
                  <Switch
                    checked={!!formData.sync_to_google}
                    onCheckedChange={(checked) => setFormData({ ...formData, sync_to_google: checked })}
                    disabled={isPending}
                    aria-label="Đồng bộ Google Calendar"
                  />
                </label>
              )}
            </section>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowMoreOptions((value) => !value)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <AlignLeft className="size-4" />
                Tùy chọn khác
              </span>
              <ChevronDown className={`size-4 transition-transform ${showMoreOptions ? "rotate-180" : ""}`} />
            </Button>

            {showMoreOptions && (
              <section className="space-y-3 rounded-lg border border-border bg-bg-card p-3">
                <Input
                  label="Vị trí"
                  placeholder="Thêm vị trí"
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={isPending}
                />
                <div className="flex items-start gap-3">
                  <MapPin className="mt-8 size-4 shrink-0 text-text-muted" />
                  <Textarea
                    label="Ghi chú"
                    placeholder="Thêm mô tả hoặc ghi chú"
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={isPending}
                    rows={3}
                  />
                </div>
              </section>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending || !formData.title.trim() || !formData.event_date || !formData.employee_id}>
              {isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </Drawer>
    );
  }

  // ================= EDIT MODE =================
  return (
    <Drawer isOpen={open} onClose={() => onOpenChange(false)} title={isEditing ? (source === "google" ? "Sửa màu Google Event" : "Sửa Sự kiện") : "Tạo Lịch trình"} width="480px">
        <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4">
          {error && <div className="error-text shrink-0">{error}</div>}
          
          <div className="space-y-4 overflow-y-auto pb-4">
            {source !== "google" && (
               <>
                 <div className="space-y-2 shrink-0">
                   <label className="label-base">Tiêu đề Sự kiện</label>
                   <Input placeholder="VD: Chụp Pre-Wedding" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} disabled={isPending || source === "task"} required />
                 </div>

                 <div className={`${source === "task" ? "space-y-2" : "form-grid-2col"} shrink-0`}>
                    <DatePicker 
                      label={source === "task" ? (event?.originalDateField === "start_date" ? "Ngày bắt đầu" : "Ngày deadline") : "Ngày bắt đầu"}
                      compact
                      value={formData.event_date.split("T")[0]}
                      onChange={(d) => setFormData({ ...formData, event_date: source === "task" ? d : `${d}T${formData.event_date.split("T")[1] || "09:00"}` })}
                      className="w-full min-w-0"
                    />
                    {source === "schedule" && (
                    <Input 
                      label="Giờ bắt đầu"
                      type="time" 
                      value={formData.event_date.split("T")[1] || "09:00"}
                      onChange={(e) => setFormData({ ...formData, event_date: `${formData.event_date.split("T")[0] || format(new Date(), "yyyy-MM-dd")}T${e.target.value}` })}
                      disabled={isPending} 
                      required 
                    />
                    )}
                 </div>

                 {source === "schedule" && (
                 <div className="form-grid-2col shrink-0">
                    <DatePicker 
                      label="Ngày kết thúc"
                      compact
                      placeholder="Không"
                      value={formData.end_date ? formData.end_date.split("T")[0] : ""}
                      onChange={(d) => setFormData({ ...formData, end_date: d ? `${d}T${formData.end_date?.split("T")[1] || "10:00"}` : "" })}
                      className="w-full min-w-0"
                    />
                    <Input 
                      label="Giờ kết thúc"
                      type="time" 
                      value={formData.end_date?.split("T")[1] || ""}
                      onChange={(e) => setFormData({ ...formData, end_date: formData.end_date ? `${formData.end_date.split("T")[0]}T${e.target.value}` : "" })}
                      disabled={isPending || !formData.end_date} 
                    />
                 </div>
                 )}

                 <div className="space-y-2 shrink-0">
                   <SimpleSelect label="Chủ sự kiện (Phụ trách)" value={formData.employee_id} onChange={(v) => setFormData({...formData, employee_id: v})} disabled={isPending || (source === "task" && !isGlobalAdmin)} options={employees.map(e => ({ value: e.id, label: e.name }))} placeholder="--- Chọn nhân sự ---" />
                 </div>
               </>
            )}

            {!isEditing && isGoogleConnected && (
               <div className="space-y-2 p-3 bg-bg-input rounded-lg mt-2 shrink-0">
                   <label className="uppercase text-xs font-semibold text-text-main tracking-wider">Đồng bộ External</label>
                   <label className="flex items-center justify-between gap-2 mt-1 cursor-pointer">
                      <span className="text-sm font-medium">Bật Google Calendar Push</span>
                      <Switch checked={!!formData.sync_to_google} onCheckedChange={(checked) => setFormData({...formData, sync_to_google: checked})} disabled={isPending} />
                   </label>
               </div>
            )}
          </div>

          <div className="form-actions mt-auto pt-4 shrink-0">
            {isEditing && event?.editable && source === "schedule" ? (
               <Button type="button" variant="danger" disabled={isPending} onClick={handleDelete}>Xoá</Button>
            ) : <div />}
            <div className="flex gap-2">
               <Button type="button" variant="outline" disabled={isPending} onClick={() => isEditing ? setIsEditMode(false) : onOpenChange(false)}>Huỷ</Button>
               {(!isEditing || event?.editable || source === "google") && (
                 <Button type="submit" disabled={isPending}>
                   {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                 </Button>
               )}
            </div>
          </div>
        </form>
    </Drawer>
  );
}
