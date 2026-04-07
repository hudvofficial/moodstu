"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Switch } from "@/components/ui/switch";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, patchGoogleCalendarEvent, CalendarSchedulePayload } from "@/app/actions/calendar-mutations";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { Role } from "@/types/roles";
import { GOOGLE_COLORS } from "@/lib/utils/calendar-utils";
import { ExternalLink, Trash, Edit2, FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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

  const isEditing = !!event;
  const source = event?.source || "schedule";

  const formatDatetimeLocal = (date?: Date | null, isoString?: string | null) => {
    if (isoString) {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 16);
    }
    if (date) {
      if (isNaN(date.getTime())) return "";
      const offset = date.getTimezoneOffset() * 60000;
      return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
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

  const [googleColor, setGoogleColor] = useState<string>("9"); // Default Blueberry

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
         });
         // If we open an existing event, default to view mode
         setIsEditMode(false);
         if (source === "google") {
            // Mapping from tailwind class back to Google format isn't strictly necessary for patching, 
            // but we can try to find by color in GOOGLE_COLORS if we wanted to
            const match = GOOGLE_COLORS.find(c => event.colorToken?.includes(c.color.replace('bg-', '')));
            if (match) setGoogleColor(match.id);
         }
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
         setIsEditMode(true);
      }
      setError(null);
    }
  }, [open, isEditing, event, defaultDate, userRole, currentUserId, source]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Xử lý riêng cho source google (PATCH color)
    if (source === "google" && event?.originalGoogleEvent) {
      startTransition(async () => {
        try {
          const res = await patchGoogleCalendarEvent(event.originalGoogleEvent!.id, { colorId: googleColor });
          if (!res.success) throw new Error(res.error);
          toast.success("Đã cập nhật màu sự kiện trên Google Calendar!");
          onSuccess?.();
          onOpenChange(false);
        } catch (err: any) {
          setError(err.message || "Lỗi giao tiếp máy chủ.");
        }
      });
      return;
    }

    if (!formData.title.trim() || !formData.event_date || !formData.employee_id) {
       setError("Vui lòng điền đủ Tiêu đề, Ngày bắt/kết và người phụ trách.");
       return;
    }
    
    startTransition(async () => {
       try {
          const res = isEditing 
            ? await updateCalendarEvent(formData)
            : await createCalendarEvent(formData);

          if (!res.success) throw new Error(res.error || "Thao tác thất bại.");

          if (res.data && typeof res.data === "object" && 'warning' in res.data && res.data.warning) {
             toast.warning(res.data.warning, { duration: 5000 });
          } else {
             toast.success(isEditing ? "Đã cập nhật sự kiện!" : "Đã tạo sự kiện!");
          }

          onSuccess?.();
          onOpenChange(false);
       } catch (err: any) {
          setError(err.message || "Lỗi giao tiếp máy chủ.");
       }
    });
  };

  const handleDelete = () => {
     if (!event?.id) return;
     if (!confirm("Bạn có chắc chắn muốn xoá sự kiện này?")) return;
     setError(null);
     startTransition(async () => {
       try {
           const res = await deleteCalendarEvent(event.id);
           if (!res.success) throw new Error(res.error || "Xoá sự kiện thất bại.");
           toast.success("Đã xoá sự kiện!");
           onSuccess?.();
           onOpenChange(false);
       } catch (err: any) {
          setError(err.message || "Lỗi giao tiếp máy chủ.");
       }
    });
  };

  // ================= VIEW MODE =================
  if (!isEditMode && isEditing && event) {
    const formatTime = (iso?: string) => iso && iso.includes("T") ? new Date(iso).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : "";
    const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "";

    return (
      <Drawer isOpen={open} onClose={() => onOpenChange(false)} title="Chi tiết Sự kiện" width="480px">
        <div className="flex flex-col h-full space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {source === "google" && <Badge variant="neutral" className="bg-amber-100 text-amber-800 hover:bg-amber-100">GOOGLE</Badge>}
              {source === "task" && <Badge variant="neutral" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">TASK</Badge>}
              {source === "schedule" && <Badge variant="primary">LỊCH TRÌNH</Badge>}
            </div>
            <h3 className="text-xl font-bold text-text-main">{event.title}</h3>
            {event.workTypeLabel && <p className="text-sm text-text-muted mt-1">{event.workTypeLabel}</p>}
          </div>

          <div className="space-y-4 py-4 border-y border-border">
            <div className="flex flex-col gap-1">
               <span className="text-xs font-semibold text-text-muted uppercase">Thời gian</span>
               <span className="text-sm font-medium">
                 {formatDate(event.start)} {formatTime(event.start) ? `• ${formatTime(event.start)}` : ""}
                 {event.end && ` - ${formatDate(event.end)} ${formatTime(event.end) ? `• ${formatTime(event.end)}` : ""}`}
               </span>
            </div>
            {event.employeeName && (
              <div className="flex flex-col gap-1">
                 <span className="text-xs font-semibold text-text-muted uppercase">Phụ trách</span>
                 <span className="text-sm font-medium">{event.employeeName}</span>
              </div>
            )}
            {event.customerName && (
               <div className="flex flex-col gap-1">
                 <span className="text-xs font-semibold text-text-muted uppercase">Khách hàng</span>
                 <span className="text-sm font-medium">{event.customerName}</span>
               </div>
            )}
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-2 shrink-0">
             {source === "google" && event.originalGoogleEvent?.htmlLink && (
                <a href={event.originalGoogleEvent.htmlLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full justify-start gap-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50">
                     <ExternalLink className="w-4 h-4" /> Mở trong Google Calendar
                  </Button>
                </a>
             )}

             {source === "schedule" && !event.contractId && (
                <Link href={`/contracts/create?date=${event.start.split("T")[0]}`}>
                  <Button variant="primary" className="w-full justify-start gap-2">
                     <FileText className="w-4 h-4" /> Tạo Hợp đồng từ lịch này
                  </Button>
                </Link>
             )}
            
             <div className="flex gap-2">
                {event.editable && source !== "google" && (
                   <Button variant="outline" className="flex-1 justify-center gap-2" onClick={() => setIsEditMode(true)}>
                      <Edit2 className="w-4 h-4" /> Chỉnh sửa
                   </Button>
                )}
                {source === "google" && (
                   <Button variant="outline" className="flex-1 justify-center gap-2" onClick={() => setIsEditMode(true)}>
                      <Edit2 className="w-4 h-4" /> Chọn màu hiển thị
                   </Button>
                )}
                {event.editable && source === "schedule" && (
                   <Button variant="danger" className="justify-center gap-2" onClick={handleDelete} disabled={isPending}>
                      <Trash className="w-4 h-4" /> Xoá
                   </Button>
                )}
             </div>
          </div>
        </div>
      </Drawer>
    );
  }

  // ================= EDIT MODE =================
  return (
    <Drawer isOpen={open} onClose={() => onOpenChange(false)} title={isEditing ? (source === "google" ? "Sửa màu Google Event" : "Sửa Sự kiện") : "Tạo Lịch trình"} width="480px">
        <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm shrink-0">{error}</div>}
          
          <div className="space-y-4 overflow-y-auto pb-4">
            {source !== "google" && (
               <>
                 <div className="space-y-2 shrink-0">
                   <label className="text-sm font-medium">Tiêu đề Sự kiện</label>
                   <Input placeholder="VD: Chụp Pre-Wedding" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} disabled={isPending || source === "task"} required />
                 </div>

                 <div className="grid grid-cols-2 gap-4 shrink-0">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Thời gian bắt đầu</label>
                      <Input type="datetime-local" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} disabled={isPending} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Thời gian kết thúc</label>
                      <Input type="datetime-local" value={formData.end_date || ""} onChange={(e) => setFormData({...formData, end_date: e.target.value})} disabled={isPending} />
                    </div>
                 </div>

                 <div className="space-y-2 shrink-0">
                   <SimpleSelect label="Chủ sự kiện (Phụ trách)" value={formData.employee_id} onChange={(v) => setFormData({...formData, employee_id: v})} disabled={isPending} options={employees.map(e => ({ value: e.id, label: e.name }))} placeholder="--- Chọn nhân sự ---" />
                 </div>
               </>
            )}

            {/* Màu Google Event (Dirty-field patch) */}
            {source === "google" && (
               <div className="space-y-3 shrink-0">
                  <label className="text-sm font-medium block">Màu sắc sự kiện trên Google</label>
                  <div className="flex flex-wrap gap-2">
                     {GOOGLE_COLORS.map(c => (
                        <div
                           key={c.id}
                           role="button"
                           onClick={() => setGoogleColor(c.id)}
                           className={`w-8 h-8 rounded-full border-2 transition-all ${c.color} ${googleColor === c.id ? "border-text-main scale-110 shadow-sm" : "border-transparent opacity-80 hover:opacity-100"}`}
                           title={c.label}
                        />
                     ))}
                  </div>
                  <p className="text-xs text-text-muted mt-2">Màu thay đổi sẽ được đồng bộ lên Google Calendar của bạn.</p>
               </div>
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

          <div className="mt-auto pt-4 flex items-center justify-between gap-3 shrink-0">
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
