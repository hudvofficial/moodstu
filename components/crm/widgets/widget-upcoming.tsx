import { CalendarClock, Phone } from "lucide-react";
import { format, addDays } from "date-fns";
import { vi } from "date-fns/locale";

export interface ReminderProps {
  id: string | number;
  name: string;
  action: string;
  date: Date | string;
}

interface WidgetUpcomingProps {
  reminders?: ReminderProps[];
}

export function WidgetUpcoming({ reminders }: WidgetUpcomingProps) {
  // Use passed reminders or fallback to an empty/mock list for demonstration
  const displayData = reminders && reminders.length > 0 ? reminders : [
    { id: 1, name: "Chị Ngọc Tuyền", action: "Gọi tư vấn gói", date: new Date() },
    { id: 2, name: "Anh Nam Việt", action: "Gửi báo giá", date: addDays(new Date(), 1) },
    { id: 3, name: "Chị Khả Vy", action: "Hẹn thử váy", date: addDays(new Date(), 2) },
  ];

  return (
    <div className="card-base p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10">
          <CalendarClock className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-h3 text-text-primary">Lịch sắp tới</h3>
      </div>
      
      <div className="space-y-4">
        {displayData.map((item) => (
          <div key={item.id} className="flex gap-3 group cursor-pointer items-start">
            <div className="w-9 h-9 rounded-full bg-bg-hover flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/5 transition-colors">
              <Phone className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-semibold text-text-primary truncate">{item.name}</p>
              <div className="flex items-center gap-1.5 text-caption mt-0.5">
                <span className="text-interactive truncate" title={item.action}>{item.action}</span>
                <span className="text-text-muted shrink-0">•</span>
                <span className="text-text-secondary shrink-0">
                  {typeof item.date === 'string' ? item.date : format(new Date(item.date), "dd/MM", { locale: vi })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
