import { Calendar, Camera, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SERVICE_ICON: Record<string, typeof Camera> = {
  cuoi: Heart,
  baby: Sparkles,
  concept: Camera,
  default: Calendar,
};

interface UpcomingEvent {
  id: string;
  contractCode: string;
  customerName: string;
  eventDate: string;
  serviceType: string;
}

const MOCK_EVENTS: UpcomingEvent[] = [
  { id: "1", contractCode: "HD-2026-001", customerName: "Anh Tuấn & Chị Mai", eventDate: "2026-03-18", serviceType: "cuoi" },
  { id: "2", contractCode: "HD-2026-015", customerName: "Anh Đức & Chị Hương", eventDate: "2026-03-19", serviceType: "cuoi" },
  { id: "3", contractCode: "HD-2026-022", customerName: "Chị Linh", eventDate: "2026-03-20", serviceType: "baby" },
  { id: "4", contractCode: "HD-2026-030", customerName: "Anh Minh", eventDate: "2026-03-21", serviceType: "concept" },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  return `${diff} ngày nữa`;
}

export function UpcomingEventsList() {
  return (
    <div className="card-base p-5 entrance entrance-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-info/10">
            <Calendar className="w-4 h-4 text-info" />
          </div>
          <h3 className="text-h3">Hợp đồng sắp chụp</h3>
        </div>
        <Button unstyled className="text-caption link-base min-h-11 flex items-center">Xem tất cả</Button>
      </div>

      <div className="space-y-3">
        {MOCK_EVENTS.map((event) => {
          const Icon = SERVICE_ICON[event.serviceType] || SERVICE_ICON.default;
          return (
            <div
              key={event.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg",
                "bg-bg-base/60 hover:bg-bg-hover transition-colors cursor-pointer"
              )}
            >
              <div className="icon-box bg-primary/8">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium truncate">{event.customerName}</p>
                <p className="text-caption">{event.contractCode}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-body-sm font-semibold">{formatDate(event.eventDate)}</p>
                <p className="text-caption">{getDaysUntil(event.eventDate)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
