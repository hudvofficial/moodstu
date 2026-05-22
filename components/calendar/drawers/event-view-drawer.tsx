import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Edit2, Trash } from "lucide-react";
import Link from "next/link";
import { UnifiedCalendarEvent } from "@/types/calendar.types";

export interface EventViewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: UnifiedCalendarEvent;
  source: string;
  setIsEditMode: (mode: boolean) => void;
  handleDelete: () => void;
  isPending: boolean;
}

export function EventViewDrawer({
  open,
  onOpenChange,
  event,
  source,
  setIsEditMode,
  handleDelete,
  isPending
}: EventViewDrawerProps) {
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
