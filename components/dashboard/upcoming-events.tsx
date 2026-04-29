import Link from "next/link";
import { Calendar, Camera, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpcomingEventData } from "@/types/dashboard";

const SERVICE_ICON: Record<string, typeof Camera> = {
  ngay_cuoi: Heart,
  combo: Heart,
  baby: Sparkles,
  gia_dinh: Sparkles,
  concept: Camera,
  studio: Camera,
  media: Camera,
  default: Calendar,
};

interface UpcomingEventsListProps {
  events: UpcomingEventData[];
  canView: boolean;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "--/--";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return "";

  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = Math.round((target.getTime() - now.getTime()) / 86_400_000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  return `${diff} ngày nữa`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-38 items-center justify-center rounded-lg border border-dashed border-border bg-bg-base/50 px-4 text-center text-body-sm text-text-secondary">
      {message}
    </div>
  );
}

export function UpcomingEventsList({ events, canView }: UpcomingEventsListProps) {
  return (
    <div className="card-base p-5 entrance entrance-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="icon-box bg-info/10">
            <Calendar className="h-4 w-4 text-info" />
          </div>
          <h3 className="text-h3">Lịch sắp tới</h3>
        </div>
        <Link href="/calendar" className="link-base min-h-11 shrink-0 text-caption">
          Xem tất cả
        </Link>
      </div>

      {!canView ? (
        <EmptyState message="Vai trò hiện tại không có quyền xem lịch dashboard." />
      ) : events.length === 0 ? (
        <EmptyState message="Chưa có lịch sắp tới trong 14 ngày tới." />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const Icon = SERVICE_ICON[event.serviceType] || SERVICE_ICON.default;
            return (
              <Link
                key={`${event.source}-${event.id}`}
                href={event.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3",
                  "bg-bg-base/60 transition-colors hover:bg-bg-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                <div className="icon-box bg-primary/8">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium">{event.customerName}</p>
                  <p className="text-caption">
                    {event.contractCode || event.sourceLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-body-sm font-semibold">{formatDate(event.eventDate)}</p>
                  <p className="text-caption">{getDaysUntil(event.eventDate)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
