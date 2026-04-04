"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Switch } from "@/components/ui/switch";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, CalendarSchedulePayload } from "@/app/actions/calendar-mutations";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { Role } from "@/types/roles";

interface EventFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: UnifiedCalendarEvent | null; // Null if creating
  defaultDate?: Date | null;
  employees: { id: string; name: string }[];
  currentUserId?: string;
  userRole: Role;
  isGoogleConnected: boolean;
  onSuccess?: () => void;
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

  const isEditing = !!event;
  // If editing an existing imported event from google or contract task, editing core details might be locked
  const isReadonlySource = isEditing && event.source !== "schedule";

  // Format Date for Input defaults
  const formatDatetimeLocal = (date?: Date | null, isoString?: string | null) => {
    if (isoString) return new Date(isoString).toISOString().slice(0, 16);
    if (date) {
      // Offset local timezone for accurate HTML datetime-local
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
      return localISOTime;
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
  });

  useEffect(() => {
    if (open) {
      if (isEditing && event) {
         // eslint-disable-next-line
         setFormData({
            eventId: event.id,
            title: event.title,
            event_date: formatDatetimeLocal(null, event.start),
            end_date: event.end ? formatDatetimeLocal(null, event.end) : "",
            employee_id: event.employeeId || "",
            color_id: event.colorToken || "blue",
         });
      } else {
         const initialDate = defaultDate ? defaultDate : new Date();
         const isGlobalAdmin = userRole === "admin" || userRole === "manager";
         const defaultEmployee = isGlobalAdmin ? "" : (currentUserId || "");
         setFormData({
            title: "",
            event_date: formatDatetimeLocal(initialDate),
            end_date: "",
            employee_id: defaultEmployee,
            color_id: "blue",
         });
      }
      setError(null);
    }
  }, [open, isEditing, event, defaultDate, userRole, currentUserId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.event_date || !formData.employee_id) {
       setError("Vui lòng điền đủ Tiêu đề, Ngày bắt/kết và người phụ trách.");
       return;
    }
    
    setError(null);
    startTransition(async () => {
       try {
          const res = isEditing 
            ? await updateCalendarEvent(formData)
            : await createCalendarEvent(formData);

          if (!res.success) {
            setError(res.error || "Thao tác thất bại.");
            return;
          }

          if (res.data && typeof res.data === "object" && 'warning' in res.data && res.data.warning) {
             toast.warning(res.data.warning, { duration: 5000 });
          } else {
             toast.success(isEditing ? "Đã cập nhật sự kiện!" : "Đã tạo sự kiện!");
          }

          onSuccess?.();
          onOpenChange(false);
       } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Lỗi giao tiếp máy chủ.");
       }
    });
  };

  const handleDelete = () => {
     if (!event?.id) return;
     if (!confirm("Bạn có chắc chắn muốn xoá sự kiện cá nhân này?")) return;

     setError(null);
     startTransition(async () => {
       try {
           const res = await deleteCalendarEvent(event.id);
           if (!res.success) {
              setError(res.error || "Xoá sự kiện thất bại.");
              return;
           }

           if (res.data && typeof res.data === "object" && 'warning' in res.data && res.data.warning) {
              toast.warning(res.data.warning, { duration: 5000 });
           } else {
              toast.success("Đã xoá sự kiện!");
           }

           onSuccess?.();
           onOpenChange(false);
       } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Lỗi giao tiếp máy chủ.");
       }
    });
  };

  return (
    <Drawer 
       isOpen={open} 
       onClose={() => onOpenChange(false)}
       title={isEditing ? "Chi tiết Lịch trình" : "Tạo mới Lịch trình"}
       width="480px"
    >
        <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm shrink-0">{error}</div>}
          
          <div className="space-y-2 shrink-0">
            <label className="text-sm font-medium">Tiêu đề Sự kiện</label>
            <Input 
              placeholder="VD: Chụp Pre-Wedding Tường&Vân" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              disabled={isPending || isReadonlySource}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0">
             <div className="space-y-2">
               <label className="text-sm font-medium">Thời gian bắt đầu</label>
               <Input 
                 type="datetime-local"
                 value={formData.event_date}
                 onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                 disabled={isPending || isReadonlySource}
                 required
               />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-medium">Thời gian kết thúc (Tuỳ chọn)</label>
               <Input 
                 type="datetime-local"
                 value={formData.end_date || ""}
                 onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                 disabled={isPending || isReadonlySource}
               />
             </div>
          </div>

          <div className="space-y-2 shrink-0">
            <SimpleSelect 
               label="Chủ sự kiện (Phụ trách)"
               value={formData.employee_id}
               onChange={(v) => setFormData({...formData, employee_id: v})}
               disabled={isPending || isReadonlySource}
               options={employees.map(e => ({ value: e.id, label: e.name }))}
               placeholder="--- Chọn nhân sự ---"
            />
          </div>
          
          {!isEditing && isGoogleConnected && (
             <div className="space-y-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 mt-2 shrink-0">
                 <label className="uppercase text-xs font-semibold text-blue-700 tracking-wider">Đồng bộ External</label>
                 <label className="flex items-center justify-between gap-2 mt-1 cursor-pointer">
                    <span className="text-sm font-medium">Bật Google Calendar Push</span>
                    <Switch 
                      checked={!!formData.sync_to_google}
                      onCheckedChange={(checked) => setFormData({...formData, sync_to_google: checked})}
                      disabled={isPending || isReadonlySource}
                    />
                 </label>
             </div>
          )}

          <div className="mt-auto pt-4 flex items-center justify-between gap-3 shrink-0">
            {isEditing && !isReadonlySource && event?.editable ? (
               <Button type="button" variant="danger" disabled={isPending} onClick={handleDelete}>
                  Xoá
               </Button>
            ) : (
               <div /> // Spacer
            )}
            
            <div className="flex gap-2">
               <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>Huỷ</Button>
               {!isReadonlySource && (
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
