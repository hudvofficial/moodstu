"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Phone } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import { getUpcomingEventsAction } from "@/app/actions/dashboard-events";
import type { UpcomingEventData } from "@/types/dashboard";

export interface ReminderProps {
  id: string | number;
  name: string;
  action: string;
  date: Date | string;
}

interface WidgetUpcomingProps {
  reminders?: ReminderProps[];
}

type DisplayUpcomingItem = ReminderProps & {
  href?: string;
};

export function WidgetUpcoming({ reminders }: WidgetUpcomingProps) {
  const [events, setEvents] = useState<UpcomingEventData[]>([]);
  const [isLoading, setIsLoading] = useState(!reminders);

  useEffect(() => {
    if (reminders && reminders.length > 0) return;
    
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getUpcomingEventsAction();
        if (isMounted) {
          setEvents(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch upcoming events:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [reminders]);

  const displayData: DisplayUpcomingItem[] = reminders && reminders.length > 0 
    ? reminders 
    : events.map((ev) => ({
        id: ev.id,
        name: ev.customerName,
        action: ev.sourceLabel || "Nhiệm vụ",
        date: ev.eventDate,
        href: ev.href,
      }));

  return (
    <div className="card-base p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10">
          <CalendarClock className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-h3 text-text-primary">Lịch sắp tới</h3>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-start animate-pulse">
              <div className="w-9 h-9 rounded-full bg-bg-hover shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayData.length === 0 ? (
        <div className="py-6 text-center text-body-sm text-text-secondary">
          Không có lịch sắp tới
        </div>
      ) : (
        <div className="space-y-4">
          {displayData.map((item) => {
            const content = (
              <>
                <div className="w-9 h-9 rounded-full bg-bg-hover flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/5 transition-colors">
                  <Phone className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-text-primary truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 text-caption mt-0.5">
                    <span className="text-interactive truncate" title={item.action}>{item.action}</span>
                    <span className="text-text-muted shrink-0">•</span>
                    <span className="text-text-secondary shrink-0">
                      {format(new Date(item.date), "dd/MM", { locale: vi })}
                    </span>
                  </div>
                </div>
              </>
            );

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex gap-3 group cursor-pointer items-start hover:bg-bg-hover/50 p-1.5 rounded-lg transition-colors"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={item.id}
                className="flex gap-3 group cursor-pointer items-start hover:bg-bg-hover/50 p-1.5 rounded-lg transition-colors"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
